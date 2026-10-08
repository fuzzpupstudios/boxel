import z from "zod";
import { Player } from "../../entity/player";
import { guiTypeRegistry } from "../../gui/guiTypeRegistry";
import type { Inventory } from "../../item/inventory";
import { EventAction } from "../eventAction";
import { EventCursor, type EventSheet } from "../eventSheet";
import n from "../eventVariableTypes";
import type { GuiContainerEvents } from "../../gui/guiContainer";
import { isInteger, isString, parameter } from "../eventVariable";

export type OpenGuiActionParameters = z.infer<typeof OpenGuiActionParameters>;
export const OpenGuiActionParameters = z.object({
    gui: n.String,
    xOffset: n.Integer.default(0),
    yOffset: n.Integer.default(0),
    zOffset: n.Integer.default(0),
    inventories: z.record(
        z.string(),
        z.enum([ "none", "player_inventory", "block_entity" ])
    ).default({})
});

export class OpenGuiAction extends EventAction {
    private readonly gui: n.Argument<string>;
    private readonly offsetX: n.Argument<number>;
    private readonly offsetY: n.Argument<number>;
    private readonly offsetZ: n.Argument<number>;
    private readonly inventories: Map<string, "none" | "player_inventory" | "block_entity">;


    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);
        const parsed = OpenGuiActionParameters.parse(args);

        this.gui = parameter(parsed.gui, isString);
        this.offsetX = parameter(parsed.xOffset, isInteger);
        this.offsetY = parameter(parsed.yOffset, isInteger);
        this.offsetZ = parameter(parsed.zOffset, isInteger);
        this.inventories = new Map(Object.entries(parsed.inventories));
    }
    public override run(cursor: EventCursor): void {
        const inventories = new Map<string, Inventory>;

        const gui = this.gui(cursor);
        const offsetX = this.offsetX(cursor);
        const offsetY = this.offsetY(cursor);
        const offsetZ = this.offsetZ(cursor);

        const { world, x, y, z, entity } = cursor;

        for(const [ inventoryId, inventorySource ] of this.inventories) {
            let inventory: Inventory | null = null;

            if(inventorySource == "player_inventory" && entity instanceof Player) {
                inventory = entity.inventory;
            }
            if(inventorySource == "block_entity") {
                const blockEntity = cursor.world.getBlockEntity(
                    x + offsetX,
                    y + offsetY,
                    z + offsetZ
                );
                if(blockEntity != null && blockEntity.hasInventory()) {
                    inventory = blockEntity.inventory;
                }
            }

            if(inventory !== null) {
                inventories.set(inventoryId, inventory);
            }
        }

        const guiType = guiTypeRegistry.get(gui);
        if(guiType == null) throw new ReferenceError("Unknown gui type " + gui);

        let guiContainerEvents: GuiContainerEvents = {
            onSlotChanged: () => { }
        };
        if(entity instanceof Player) {
            guiContainerEvents.onSlotChanged = slot => {
                const newCursor = new EventCursor(world, x, y, z);
                newCursor.entity = entity;
                
                slot.processChange(newCursor);
            }
        }

        cursor.clientPlatform?.guiManager.openGui(guiType.createGui(inventories), guiContainerEvents);
    }
}