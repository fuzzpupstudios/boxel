import { Color, Container, Rectangle, Sprite, Texture } from "pixi.js";
import { Signal, type SignalConnection } from "typed-signals";
import { EventCursor } from "../events/eventSheet";
import type { GraphicalInterface, GuiInventorySlot } from "../item/inventoryGui";
import { ItemStack } from "../item/itemStack";
import type { GuiGraphicContainer } from "./data/guiGraphic";
import { guiGraphicRegistry } from "./data/guiGraphicRegistry";
import { TileHologram, TileHologramProvider } from "./tileHologram";
import { GuiItemStack } from "./guiItemStack";
import type { GuiItemSpriteProvider } from "./guiItem";

export class InventoryEvent {
    public consumed = false;
    public constructor(
        public readonly pointerStack: ItemStack,
        public readonly slot: number,
        public readonly gui: GraphicalInterface | null
    ) {}
    public consume() {
        this.consumed = true;
    }
}

export class GuiEvent {
    public consumed = false;
    public constructor() {}
    public consume() {
        this.consumed = true;
    }
}

export class GuiCursor {
    public readonly onSplitStack = new Signal<(event: InventoryEvent) => void>();
    public readonly onDropOne = new Signal<(event: InventoryEvent) => void>();
    public readonly onSwapStack = new Signal<(event: InventoryEvent) => void>();
    public readonly onQuickMove = new Signal<(event: InventoryEvent) => void>();
    public readonly onSelectSlot = new Signal<(event: InventoryEvent) => void>();
}

export class InventorySlotContainer extends Container {
    public readonly hoverSprite: Sprite;
    public readonly itemStack: GuiItemStack;

    public constructor(
        public readonly slotId: number,
        public readonly guiSlot: GuiInventorySlot,
        hologramProvider: TileHologramProvider,
        itemSpriteProvider: GuiItemSpriteProvider,
    ) {
        const size = guiSlot.type.size;
        const halfSize = size / 2;

        const hoverSprite = new Sprite(Texture.WHITE);
        hoverSprite.width = size;
        hoverSprite.height = size;
        hoverSprite.anchor.set(0.5);
        hoverSprite.position.set(halfSize, halfSize);
        hoverSprite.alpha = 0;
        hoverSprite.blendMode = "add";

        const itemStack = new GuiItemStack(guiSlot.slot.stack, hologramProvider, itemSpriteProvider);
        itemStack.scale.set(size / 16);
        itemStack.position.set(halfSize, halfSize);

        super({
            children: [ hoverSprite, itemStack ],
            interactiveChildren: false
        });

        this.hoverSprite = hoverSprite;
        this.itemStack = itemStack;
        this.eventMode = "static";
        this.hitArea = new Rectangle(0, 0, size, size);
    }

    public updateDisplayItem() {
        this.itemStack.updateDisplayItem();
    }

    public setSelected(selected: boolean) {
        this.hoverSprite.alpha = selected ? 0.5 : 0;
    }
}

export class GuiContainer extends Container {
    private readonly slotContainers = new Map<number, InventorySlotContainer>;
    private readonly graphicContainers = new Map<string, GuiGraphicContainer>;

    private onSwapStackHandler?: SignalConnection;
    private onSplitStackHandler?: SignalConnection;
    private onDropOneHandler?: SignalConnection;
    private onSelectSlotHandler?: SignalConnection;
    private onUpdateHandler?: SignalConnection;
    private highlightedSlot: InventorySlotContainer | null = null;

    public constructor(
        public readonly graphicalInterface: GraphicalInterface,
        hologramProvider: TileHologramProvider,
        itemSpriteProvider: GuiItemSpriteProvider,
        private readonly guiCursor: GuiCursor
    ) {
        const inventoryType = graphicalInterface.type;
        const background = new Sprite(inventoryType.texture);

        super({
            children: [ background ],
            interactiveChildren: inventoryType.interactive
        });

        this.interactive = inventoryType.interactive;

        for(const [ id, slot ] of graphicalInterface.slots.entries()) {
            const slotContainer = new InventorySlotContainer(id, slot, hologramProvider, itemSpriteProvider);
            slotContainer.pivot.set(slot.type.size / 2);
            slotContainer.position.set(slot.type.x, slot.type.y);
            this.addChild(slotContainer);
            this.slotContainers.set(id, slotContainer);
        }
        for(const [ id, graphic ] of graphicalInterface.graphics.entries()) {
            const GuiGraphicContainerConstructor = guiGraphicRegistry.get(graphic.type.type);
            if(GuiGraphicContainerConstructor == null) {
                throw new ReferenceError("GUI graphic type " + graphic.type.type + " does not exist");
            }

            const graphicContainer = new GuiGraphicContainerConstructor(id, graphic.type.args);

            graphicContainer.position.set(graphic.type.x, graphic.type.y);
            this.addChild(graphicContainer);
            this.graphicContainers.set(id, graphicContainer);
        }

        this.onSwapStackHandler = this.guiCursor.onSwapStack.connect((event) => {
            if(event.gui != this.graphicalInterface || graphicalInterface.inventory == null) return;

            const pointerStack = event.pointerStack;
            const slot = event.slot;

            if(slot == -1) return;

            const slotStack = graphicalInterface.inventory.slots[slot]?.stack;
            if(slotStack == null) return;
            
            if(slotStack.isEmpty() || slotStack.item != pointerStack.item) {
                pointerStack.swap(slotStack);
            } else {
                pointerStack.mergeInto(slotStack);
            }

            graphicalInterface.inventory.onUpdate.emit(slot);
            event.consume();
        });
        this.onSplitStackHandler = this.guiCursor.onSplitStack.connect((event) => {
            if(event.gui != this.graphicalInterface || graphicalInterface.inventory == null) return;

            const pointerStack = event.pointerStack;

            if(!pointerStack.isEmpty()) return;

            const slot = event.slot;
            if(slot == -1) return;

            const slotStack = graphicalInterface.inventory.slots[slot]?.stack;
            if(slotStack == null) return;

            if(slotStack.isEmpty()) return;
            
            slotStack.mergeInto(pointerStack, Math.ceil(slotStack.quantity / 2));

            graphicalInterface.inventory.onUpdate.emit(slot);
            event.consume();
        });
        this.onDropOneHandler = this.guiCursor.onDropOne.connect((event) => {
            if(event.gui != this.graphicalInterface || graphicalInterface.inventory == null) return;

            const pointerStack = event.pointerStack;

            if(pointerStack.isEmpty()) return;

            const slot = event.slot;
            if(slot == -1) return;

            const slotStack = graphicalInterface.inventory.slots[slot]?.stack;
            if(slotStack == null) return;
            
            pointerStack.mergeInto(slotStack, 1);

            graphicalInterface.inventory.onUpdate.emit(slot);
            event.consume();
        });
        this.onSelectSlotHandler = this.guiCursor.onSelectSlot.connect((event) => {
            const slotContainer = this.slotContainers.get(event.slot) ?? null;

            if(this.highlightedSlot != null) {
                this.highlightedSlot.setSelected(false);
            }

            if(event.gui == this.graphicalInterface) {
                if(slotContainer != null) {
                    slotContainer.setSelected(true);
                }

                this.highlightedSlot = slotContainer;
            } else {
                this.highlightedSlot = null;
            }
        });
        if(graphicalInterface.inventory != null) {
            this.onUpdateHandler = graphicalInterface.inventory.onUpdate.connect((slotId) => {
                this.slotContainers.get(slotId)?.updateDisplayItem();
            });
        }
        this.on("destroyed", () => {
            this.onSwapStackHandler?.disconnect();
            this.onSplitStackHandler?.disconnect();
            this.onDropOneHandler?.disconnect();
            this.onSelectSlotHandler?.disconnect();
            this.onUpdateHandler?.disconnect();
        });
    }

    public updateAllGraphics(cursor: EventCursor) {
        for(const [ graphicId, graphic ] of this.graphicContainers.entries()) {
            const graphicType = this.graphicalInterface.graphics.get(graphicId);
            if(graphicType == null) continue;
            
            graphic.visible = graphicType.type.renderIf.test(cursor);
        }
    }
    
    public updateAllSlots() {
        for(const slot of this.slotContainers.values()) {
            slot.updateDisplayItem();
        }
    }
    public updateSlot(slot: number) {
        this.slotContainers.get(slot)?.updateDisplayItem();
    }
}