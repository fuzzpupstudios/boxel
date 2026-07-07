import { Texture } from "pixi.js";
import type { Inventory } from "./inventory";
import type { ItemStack } from "./itemStack";


export interface InventorySlotType {
    id: number;
    x: number;
    y: number;
    insertAllowed: boolean;
    extractAllowed: boolean;
    size: number;
}

export class InventorySlot {
    public constructor(
        public stack: ItemStack,
        public type: InventorySlotType
    ) {}
}

export abstract class InventoryGuiType {
    public readonly slots = new Set<InventorySlotType>;
    public texture: Texture = Texture.EMPTY;

    public constructor(
        public readonly interactive: boolean
    ) {}

    protected addTexture(texture: Texture) {
        this.texture = texture;
    }

    protected addSlot(
        id: number,
        x: number, y: number,
        insertAllowed: boolean, extractAllowed: boolean,
        size: number
    ) {
        this.slots.add({
            id,
            x, y,
            insertAllowed, extractAllowed,
            size
        });
    }

    public createGui(inventory: Inventory): InventoryGui {
        return new InventoryGui(inventory, this);
    }
}

export class InventoryGui {
    public readonly slots = new Map<number, InventorySlot>;

    public constructor(
        public readonly inventory: Inventory,
        public readonly inventoryType: InventoryGuiType
    ) {
        for(const slotType of inventoryType.slots) {
            const slot = new InventorySlot(inventory.stacks[slotType.id]!, slotType);
            this.slots.set(slotType.id, slot);
        }
    }
}