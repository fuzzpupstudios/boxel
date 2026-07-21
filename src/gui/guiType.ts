import { Texture } from "pixi.js";
import type { EventPredicate } from "../events/eventPredicate";
import type { EventSheet } from "../events/eventSheet";
import type { Inventory, InventorySlot } from "../item/inventory";


export interface GuiInventorySlotType {
    id: string;
    x: number;
    y: number;
    size: number;
}

export interface GuiGraphicType {
    id: string;
    type: string;
    x: number;
    y: number;
    args: any;
    events: EventSheet;
    renderIf: EventPredicate;
}

export class GuiInventorySlot {
    public constructor(
        public slot: InventorySlot,
        public type: GuiInventorySlotType
    ) {}
}

export class GuiGraphic {
    public constructor(
        public type: GuiGraphicType
    ) {}
}

export abstract class GuiType {
    public readonly inventories = new Set<string>;
    public readonly quickMoveGroups = new Map<string, string[]>;
    public readonly slots = new Set<GuiInventorySlotType>;
    public readonly graphics = new Set<GuiGraphicType>;
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
        id: string,
        x: number, y: number,
        size: number
    ) {
        this.slots.add({
            id,
            x, y,
            size
        });
    }

    public createGui(inventories: Map<string, Inventory>): GraphicalInterface {
        return new GraphicalInterface(this, inventories);
    }
}

export class GraphicalInterface {
    public readonly slots = new Map<string, GuiInventorySlot>;
    public readonly graphics = new Map<string, GuiGraphic>;

    public constructor(
        public readonly type: GuiType,
        public readonly inventories: Map<string, Inventory>
    ) {
        for(const slotType of type.slots) {
            const [ inventoryId, slotIndexString ] = slotType.id.split(".");
            if(inventoryId == null || slotIndexString == null) {
                throw new ReferenceError("Invalid slot format " + slotType.id);
            }
            const inventory = this.inventories.get(inventoryId);

            if(inventory != null) {
                const inventorySlot = inventory.slots[+slotIndexString];
                if(inventorySlot == null) {
                    console.warn("Cannot find slot " + slotType.id);
                } else {
                    const slot = new GuiInventorySlot(inventorySlot, slotType);
                    this.slots.set(slotType.id, slot);
                }
            }
        }
        for(const graphicType of type.graphics) {
            const graphic = new GuiGraphic(graphicType);
            this.graphics.set(graphicType.id, graphic);
        }
    }

    public updateSlot(slotId: string) {
        const [ inventoryId, slotIndexString ] = slotId.split(".");
        if(inventoryId == null || slotIndexString == null) return;
        
        const inventory = this.inventories.get(inventoryId);
        if(inventory == null) return;

        inventory.onUpdate.emit(+slotIndexString);
    }
}