import { Texture } from "pixi.js";
import type { EventPredicate } from "../events/eventPredicate";
import type { EventSheet } from "../events/eventSheet";
import type { Inventory, InventorySlot } from "../item/inventory";
import { Gui } from "./gui";


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

export abstract class GuiType {
    public readonly inventories = new Set<string>;
    public readonly quickMoveGroups: Record<string, string[]> = {};
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

    public createGui(inventories: Map<string, Inventory>, cursorData = new Map<string, any>): Gui {
        return new Gui(this, inventories, cursorData);
    }
}