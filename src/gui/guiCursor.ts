import { Signal } from "typed-signals";
import type { InventorySlot } from "../item/inventory";
import type { Gui } from "./gui";

export class InventoryEvent {
    public consumed = false;
    public constructor(
        public readonly sourceSlot: InventorySlot,
        public readonly slotName: string | null,
        public readonly gui: Gui | null
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