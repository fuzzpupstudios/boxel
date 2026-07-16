import { Texture } from "pixi.js";
import type { EventSheet } from "../events/eventSheet";
import type { Inventory, InventorySlot } from "./inventory";
import type { ItemStack } from "./itemStack";
import type { EventPredicate } from "../events/eventPredicate";


export interface GuiInventorySlotType {
    id: number;
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
        id: number,
        x: number, y: number,
        size: number
    ) {
        this.slots.add({
            id,
            x, y,
            size
        });
    }

    public createGui(inventory: Inventory | null): GraphicalInterface {
        return new GraphicalInterface(this, inventory);
    }
}

export class GraphicalInterface {
    public readonly slots = new Map<number, GuiInventorySlot>;
    public readonly graphics = new Map<string, GuiGraphic>;

    public constructor(
        public readonly type: GuiType,
        public readonly inventory: Inventory | null
    ) {
        if(inventory != null) {
            for(const slotType of type.slots) {
                const slot = new GuiInventorySlot(inventory.slots[slotType.id]!, slotType);
                this.slots.set(slotType.id, slot);
            }
        }
        for(const graphicType of type.graphics) {
            const graphic = new GuiGraphic(graphicType);
            this.graphics.set(graphicType.id, graphic);
        }
    }
}