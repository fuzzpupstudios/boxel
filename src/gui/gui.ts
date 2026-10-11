import type { Inventory, InventorySlot } from "../item/inventory";
import { GuiType, type GuiGraphicType, type GuiInventorySlotType } from "./guiType";


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

export class Gui {
    public readonly slots = new Map<string, GuiInventorySlot>;
    public readonly graphics = new Map<string, GuiGraphic>;

    public constructor(
        public readonly type: GuiType,
        public readonly inventories: Map<string, Inventory>,
        public readonly cursorData: Map<string, any>
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
}