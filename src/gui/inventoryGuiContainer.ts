import { Color, Container, Rectangle, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { Signal, type SignalConnection } from "typed-signals";
import type { InventoryGui, InventorySlot } from "../item/inventoryGui";
import { ItemStack } from "../item/itemStack";
import { TileHologram, TileHologramProvider } from "./tileHologram";

export class GuiItemStack extends Container {
    public readonly tileHologram: TileHologram;
    public readonly counter: Text;
    public constructor(
        public readonly stack: ItemStack,
        hologramProvider: TileHologramProvider
    ) {
        const tileHologram = new TileHologram(hologramProvider);
        tileHologram.scale.set(14);
        tileHologram.position.set(1, 1);

        const counter = new Text({
            text: "",
            style: new TextStyle({
                fill: new Color(0xffffff),
                fontSize: 8,
                align: "right"
            }),
            anchor: { x: 1, y: 1 }
        });
        counter.position.set(16, 16);

        super({
            children: [ tileHologram, counter ],
            pivot: { x: 8, y: 8 }
        });

        this.tileHologram = tileHologram;
        this.counter = counter;

        this.updateDisplayItem();
    }

    public updateDisplayItem() {
        if(this.stack.isEmpty()) {
            this.visible = false;
            return;
        } else {
            this.visible = true;
        }
        this.tileHologram.blockStateId = this.stack.item;

        if(this.stack.quantity > 1) {
            let amount = this.stack.quantity;
            let suffix = "";
            if(amount >= 1000) {
                amount = Math.floor(amount / 100) / 10;
                suffix = "K";
            }
            this.counter.text = amount + suffix;
            this.counter.visible = true;
        } else {
            this.counter.visible = false;
        }
    }
}

export class InventoryEvent {
    public consumed = false;
    public constructor(
        public readonly pointerStack: ItemStack
    ) {}
    public consume() {
        this.consumed = true;
    }
}

export class InventoryCursor {
    public readonly onSplitStack = new Signal<(event: InventoryEvent) => void>();
    public readonly onDropOne = new Signal<(event: InventoryEvent) => void>();
    public readonly onSwapStack = new Signal<(event: InventoryEvent) => void>();
    public readonly onQuickMove = new Signal<(event: InventoryEvent) => void>();
}

export class InventorySlotContainer extends Container {
    public readonly hoverSprite: Sprite;
    public readonly itemStack: GuiItemStack;
    public hovered: boolean = false;

    public constructor(
        public readonly id: number,
        public readonly slot: InventorySlot,
        hologramProvider: TileHologramProvider
    ) {
        const size = slot.type.size;
        const halfSize = size / 2;

        const hoverSprite = new Sprite(Texture.WHITE);
        hoverSprite.width = size;
        hoverSprite.height = size;
        hoverSprite.anchor.set(0.5);
        hoverSprite.position.set(halfSize, halfSize);
        hoverSprite.alpha = 0;
        hoverSprite.blendMode = "add";

        const itemStack = new GuiItemStack(slot.stack, hologramProvider);
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

        this.on("pointerover", () => {
            this.hovered = true;
            hoverSprite.alpha = 0.5;
        });
        this.on("pointerout", () => {
            this.hovered = false;
            hoverSprite.alpha = 0;
        });
    }

    public updateDisplayItem() {
        this.itemStack.updateDisplayItem();
    }
}

export class InventoryGuiContainer extends Container {
    private readonly slotContainers = new Map<number, InventorySlotContainer>;
    private onSwapStackHandler: SignalConnection;
    private onSplitStackHandler: SignalConnection;
    private onDropOneHandler: SignalConnection;
    private onUpdateHandler: SignalConnection;

    public constructor(
        public readonly inventoryGui: InventoryGui,
        hologramProvider: TileHologramProvider,
        private readonly inventoryCursor: InventoryCursor
    ) {
        const inventoryType = inventoryGui.inventoryType;
        const background = new Sprite(inventoryType.texture);

        super({
            children: [ background ],
            interactive: inventoryType.interactive,
            interactiveChildren: inventoryType.interactive
        });

        for(const [ id, slot ] of inventoryGui.slots.entries()) {
            const slotContainer = new InventorySlotContainer(id, slot, hologramProvider);
            slotContainer.position.set(slot.type.x, slot.type.y);
            this.addChild(slotContainer);
            this.slotContainers.set(id, slotContainer);
        }

        this.onSwapStackHandler = inventoryCursor.onSwapStack.connect((event) => {
            const pointerStack = event.pointerStack;

            const slot = this.getHoveredSlot();
            if(slot == -1) return;

            const slotStack = inventoryGui.inventory.stacks[slot];
            if(slotStack == null) return;
            
            if(slotStack.isEmpty() || slotStack.item != pointerStack.item) {
                pointerStack.swap(slotStack);
            } else {
                pointerStack.mergeInto(slotStack);
            }

            inventoryGui.inventory.onUpdate.emit(slot);
            event.consume();
        });
        this.onSplitStackHandler = inventoryCursor.onSplitStack.connect((event) => {
            const pointerStack = event.pointerStack;

            if(!pointerStack.isEmpty()) return;

            const slot = this.getHoveredSlot();
            if(slot == -1) return;

            const slotStack = inventoryGui.inventory.stacks[slot];
            if(slotStack == null) return;

            if(slotStack.isEmpty()) return;
            
            slotStack.mergeInto(pointerStack, Math.ceil(slotStack.quantity / 2));

            inventoryGui.inventory.onUpdate.emit(slot);
            event.consume();
        });
        this.onDropOneHandler = inventoryCursor.onDropOne.connect((event) => {
            const pointerStack = event.pointerStack;

            if(pointerStack.isEmpty()) return;

            const slot = this.getHoveredSlot();
            if(slot == -1) return;

            const slotStack = inventoryGui.inventory.stacks[slot];
            if(slotStack == null) return;
            
            pointerStack.mergeInto(slotStack, 1);

            inventoryGui.inventory.onUpdate.emit(slot);
            event.consume();
        });
        this.onUpdateHandler = inventoryGui.inventory.onUpdate.connect((slotId) => {
            this.slotContainers.get(slotId)?.updateDisplayItem();
        });
        this.on("destroyed", () => {
            console.log("destroyed");
            this.onSwapStackHandler.disconnect();
            this.onSplitStackHandler.disconnect();
            this.onDropOneHandler.disconnect();
            this.onUpdateHandler.disconnect();
        });
    }
    private getHoveredSlot() {
        for(const [ id, slotContainer ] of this.slotContainers) {
            if(slotContainer.hovered) return id;
        }
        return -1;
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