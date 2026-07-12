import { Texture } from "pixi.js";
import type { EventSheet } from "../events/eventSheet";
import type { Inventory } from "./inventory";
import type { ItemStack } from "./itemStack";
import type { EventPredicate } from "../events/eventPredicate";


export interface InventorySlotType {
    id: number;
    x: number;
    y: number;
    insertAllowed: boolean;
    extractAllowed: boolean;
    size: number;
}

export interface InventoryGraphicType {
    id: string;
    type: string;
    x: number;
    y: number;
    args: any;
    events: EventSheet;
    renderIf: EventPredicate;
}

export class InventorySlot {
    public constructor(
        public stack: ItemStack,
        public type: InventorySlotType
    ) {}
}

export class InventoryGraphic {
    public constructor(
        public type: InventoryGraphicType
    ) {}
}

export abstract class InventoryGuiType {
    public readonly slots = new Set<InventorySlotType>;
    public readonly graphics = new Set<InventoryGraphicType>;
    public texture: Texture = Texture.EMPTY;

    public constructor(
        public readonly id: string,
        public readonly interactive: boolean,
        public readonly modal: boolean,
        public readonly anchor: [ number, number ],
        public readonly offset: [ number, number ]
    ) {}

    protected addTexture(texture: Texture) {
        this.texture = texture;
    }

    protected addGraphic(
        id: string, type: string,
        x: number, y: number,
        args: any,
        events: EventSheet,
        renderIf: EventPredicate
    ) {
        this.graphics.add({
            id, type,
            x, y,
            args,
            events,
            renderIf
        });
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

    public createGui(inventory: Inventory | null): GraphicalInterface {
        return new GraphicalInterface(this, inventory);
    }
}

export class GraphicalInterface {
    public readonly slots = new Map<number, InventorySlot>;
    public readonly graphics = new Map<string, InventoryGraphic>;

    public constructor(
        public readonly inventoryType: InventoryGuiType,
        public readonly inventory: Inventory | null
    ) {
        if(inventory != null) {
            for(const slotType of inventoryType.slots) {
                const slot = new InventorySlot(inventory.stacks[slotType.id]!, slotType);
                this.slots.set(slotType.id, slot);
            }
        }
        for(const graphicType of inventoryType.graphics) {
            const graphic = new InventoryGraphic(graphicType);
            this.graphics.set(graphicType.id, graphic);
        }
    }
}