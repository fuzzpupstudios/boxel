import { Container, Rectangle, Sprite, Texture } from "pixi.js";
import { type SignalConnection } from "typed-signals";
import { EventCursor } from "../../events/eventSheet";
import type { GuiGraphicContainer } from "../graphic/graphic";
import { guiGraphicRegistry } from "../graphic/graphicRegistry";
import type { Gui, GuiInventorySlot } from "../gui";
import type { GuiCursor } from "../guiCursor";
import type { GuiItemSpriteProvider } from "./itemSprite";
import { GuiItemStack } from "./itemStack";
import { TileHologramProvider } from "./tileHologram";

export class GuiContainer extends Container {
    private readonly slotContainers = new Map<string, GuiSlotContainer>;
    private readonly graphicContainers = new Map<string, GuiGraphicContainer>;

    private onSwapStackHandler?: SignalConnection;
    private onSplitStackHandler?: SignalConnection;
    private onDropOneHandler?: SignalConnection;
    private onQuickMoveHandler?: SignalConnection;
    private onSelectSlotHandler?: SignalConnection;
    private onUpdateHandler?: SignalConnection;
    private highlightedSlot: GuiSlotContainer | null = null;

    public constructor(
        public readonly gui: Gui,
        hologramProvider: TileHologramProvider,
        itemSpriteProvider: GuiItemSpriteProvider,
        private readonly guiCursor: GuiCursor
    ) {
        const guiType = gui.type;
        const background = new Sprite(guiType.texture);

        super({
            children: [ background ],
            interactiveChildren: guiType.interactive
        });

        this.interactive = guiType.interactive;

        for(const [ id, slot ] of gui.slots.entries()) {
            const slotContainer = new GuiSlotContainer(slot, hologramProvider, itemSpriteProvider);
            slotContainer.pivot.set(slot.type.size / 2);
            slotContainer.position.set(slot.type.x, slot.type.y);
            this.addChild(slotContainer);
            this.slotContainers.set(id, slotContainer);
        }
        for(const [ id, graphic ] of gui.graphics.entries()) {
            const GuiGraphicContainerConstructor = guiGraphicRegistry.get(graphic.type.type);
            if(GuiGraphicContainerConstructor == null) {
                throw new ReferenceError("GUI graphic type " + graphic.type.type + " does not exist");
            }

            try {
                const graphicContainer = new GuiGraphicContainerConstructor(id, graphic.type.args);

                graphicContainer.position.set(graphic.type.x, graphic.type.y);
                this.addChild(graphicContainer);
                this.graphicContainers.set(id, graphicContainer);
            } catch(e) {
                throw new Error(`Failed to create gui graphic "${id}" (type "${graphic.type.type}")`, { cause: e })
            }
        }

        this.onSwapStackHandler = this.guiCursor.onSwapStack.connect((event) => {
            if(event.gui != this.gui) return;

            const { sourceSlot, slotName } = event;

            if(slotName == null) return;

            const guiSlot = gui.slots.get(slotName);
            if(guiSlot == null) return;

            const destinationSlot = guiSlot.slot;

            if(sourceSlot.stack.isEmpty()) {
                // pick up stack
                if(sourceSlot.allowInsert && destinationSlot.allowExtract) {
                    const transferred = destinationSlot.stack.mergeInto(sourceSlot.stack);
                    if(transferred !== 0) {
                        sourceSlot.onInsert();
                        destinationSlot.onExtract();
                    }
                }
            } else if(destinationSlot.stack.isEmpty()) {
                // drop stack
                if(destinationSlot.allowInsert && sourceSlot.allowExtract) {
                    const transferred = sourceSlot.stack.mergeInto(destinationSlot.stack);
                    if(transferred !== 0) {
                        sourceSlot.onExtract();
                        destinationSlot.onInsert();
                    }
                }
            } else if(sourceSlot.stack.similarTo(destinationSlot.stack)) {
                // merge stack
                if(destinationSlot.allowInsert && sourceSlot.allowExtract) {
                    // merge into destination stack
                    const transferred = sourceSlot.stack.mergeInto(destinationSlot.stack);
                    if(transferred !== 0) {
                        sourceSlot.onExtract();
                        destinationSlot.onInsert();
                    }
                } else if(destinationSlot.allowExtract && sourceSlot.allowInsert) {
                    // merge into source stack
                    const transferred = destinationSlot.stack.mergeInto(sourceSlot.stack);
                    if(transferred !== 0) {
                        sourceSlot.onInsert();
                        destinationSlot.onExtract();
                    }
                }
            } else {
                // swap stack
                if(
                    destinationSlot.allowInsert && destinationSlot.allowExtract &&
                    sourceSlot.allowInsert && sourceSlot.allowExtract
                ) {
                    sourceSlot.stack.swap(destinationSlot.stack);
                    const transferred = sourceSlot.stack.quantity + destinationSlot.stack.quantity;
                    if(transferred !== 0) {
                        sourceSlot.onSwap();
                        destinationSlot.onSwap();
                    }
                }
            }
            
            event.consume();
        });
        this.onSplitStackHandler = this.guiCursor.onSplitStack.connect((event) => {
            if(event.gui != this.gui) return;

            const { sourceSlot, slotName } = event;

            if(slotName == null) return;
            if(!sourceSlot.stack.isEmpty()) return;
            if(!sourceSlot.allowInsert) return event.consume();

            const guiSlot = gui.slots.get(slotName);
            if(guiSlot == null) return;
            const destinationSlot = guiSlot.slot;
            if(!destinationSlot.allowExtract) return event.consume();

            if(destinationSlot.stack.isEmpty()) return;
            
            const splitQuantity = Math.ceil(destinationSlot.stack.quantity / 2);
            const transferred = destinationSlot.stack.mergeInto(sourceSlot.stack, splitQuantity);

            if(transferred !== 0) {
                sourceSlot.onInsert();
                destinationSlot.onExtract();
            }

            event.consume();
        });
        this.onDropOneHandler = this.guiCursor.onDropOne.connect((event) => {
            if(event.gui != this.gui) return;

            const { sourceSlot, slotName } = event;

            if(slotName == null) return;
            if(sourceSlot.stack.isEmpty()) return;
            if(!sourceSlot.allowExtract) return event.consume();

            const guiSlot = gui.slots.get(slotName);
            if(guiSlot == null) return;
            const destinationSlot = guiSlot.slot;
            if(!destinationSlot.allowInsert) return event.consume();
            
            const transferred = sourceSlot.stack.mergeInto(destinationSlot.stack, 1);
            if(transferred !== 0) {
                sourceSlot.onExtract();
                destinationSlot.onInsert();
            }

            event.consume();
        });
        this.onQuickMoveHandler = this.guiCursor.onQuickMove.connect((event) => {
            if(event.gui != this.gui) return;

            const { slotName } = event;
            if(slotName == null) return;

            const guiSlot = gui.slots.get(slotName);
            if(guiSlot == null) return;
            const sourceSlot = guiSlot.slot;
            if(!sourceSlot.allowExtract) return event.consume();

            const quickMoveGroups = this.gui.type.quickMoveGroups;
            
            let currentGroup: string | null = null;
            for(const [ groupName, groupSlots ] of Object.entries(quickMoveGroups)) {
                if(groupSlots.includes(slotName)) currentGroup = groupName;
            }

            
            const quickMoveGroupNames = Object.keys(quickMoveGroups);
            if(quickMoveGroupNames.length == 0) return event.consume();

            if(currentGroup == null) currentGroup = quickMoveGroupNames.at(-1)!;
            
            for(let i = 0; i < quickMoveGroupNames.length && !sourceSlot.stack.isEmpty(); i++) {
                const nextIndex = (quickMoveGroupNames.indexOf(currentGroup) + 1 + i) % quickMoveGroupNames.length;
                const newGroup = quickMoveGroups[quickMoveGroupNames[nextIndex]];

                for(let j = 0; j < newGroup.length && !sourceSlot.stack.isEmpty(); j++) {
                    const otherSlotId = newGroup[j];
                    const guiSlot = gui.slots.get(otherSlotId);
                    if(guiSlot == null) continue;

                    const destinationSlot = guiSlot.slot;
                    if(!destinationSlot.allowInsert) continue;

                    const transferred = sourceSlot.stack.mergeInto(destinationSlot.stack);

                    if(transferred !== 0) {
                        sourceSlot.onExtract();
                        destinationSlot.onInsert();
                    }
                }
            }

            event.consume();
        });
        this.onSelectSlotHandler = this.guiCursor.onSelectSlot.connect((event) => {
            const slotContainer = event.slotName == null ? null : (this.slotContainers.get(event.slotName) ?? null);

            if(this.highlightedSlot != null) {
                this.highlightedSlot.setSelected(false);
            }

            if(event.gui == this.gui) {
                if(slotContainer != null) {
                    slotContainer.setSelected(true);
                }

                this.highlightedSlot = slotContainer;
            } else {
                this.highlightedSlot = null;
            }
        });
        for(const [ inventoryId, inventory ] of gui.inventories.entries()) {
            this.onUpdateHandler = inventory.onUpdate.connect((slotId) => {
                this.slotContainers.get(inventoryId + "." + slotId)?.updateDisplayItem();
            });
        }
        this.on("destroyed", () => {
            this.onSwapStackHandler?.disconnect();
            this.onSplitStackHandler?.disconnect();
            this.onDropOneHandler?.disconnect();
            this.onSelectSlotHandler?.disconnect();
            this.onUpdateHandler?.disconnect();
            this.onQuickMoveHandler?.disconnect();
        });
    }

    public getGraphicContainer(id: string) {
        return this.graphicContainers.get(id);
    }

    public updateAllGraphics(cursor: EventCursor) {
        cursor.gui = this;
        
        for(const [ key, value ] of this.gui.cursorData) {
            cursor.variables.set(key, value);
        }

        for(const [ graphicId, graphicContainer ] of this.graphicContainers.entries()) {
            const graphic = this.gui.graphics.get(graphicId);
            if(graphic == null) continue;
        
            cursor.graphic = graphicContainer;
            graphicContainer.visible = graphic.type.renderIf(cursor);
            graphic.type.events.runTrigger("base:ui/render", cursor);
        }
    }
    
    public updateAllSlots() {
        for(const slot of this.slotContainers.values()) {
            slot.updateDisplayItem();
        }
    }
    public updateSlot(slot: string) {
        this.slotContainers.get(slot)?.updateDisplayItem();
    }
}

export class GuiSlotContainer extends Container {
    public readonly hoverSprite: Sprite;
    public readonly guiItemStack: GuiItemStack;

    public constructor(
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

        const guiItemStack = new GuiItemStack(guiSlot.slot.stack, hologramProvider, itemSpriteProvider);
        guiItemStack.scale.set(size / 16);
        guiItemStack.position.set(halfSize, halfSize);

        super({
            children: [ hoverSprite, guiItemStack ],
            interactiveChildren: false
        });

        this.hoverSprite = hoverSprite;
        this.guiItemStack = guiItemStack;
        this.eventMode = "static";
        this.hitArea = new Rectangle(0, 0, size, size);
    }

    public updateDisplayItem() {
        this.guiItemStack.updateDisplayItem();
    }

    public setSelected(selected: boolean) {
        this.hoverSprite.alpha = selected ? 0.5 : 0;
    }
}