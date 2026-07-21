import z from "zod";
import { Player } from "../../entity/player";
import { guiTypeRegistry } from "../../gui/guiTypeRegistry";
import type { Inventory } from "../../item/inventory";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

export type OpenGuiActionParameters = z.infer<typeof OpenGuiActionParameters>;
export const OpenGuiActionParameters = z.object({
    gui: z.string(),
    xOffset: z.int().default(0),
    yOffset: z.int().default(0),
    zOffset: z.int().default(0),
    inventories: z.record(
        z.string(),
        z.enum([ "none", "player_inventory", "block_entity" ])
    ).default({})
});

export class OpenGuiAction extends EventAction<OpenGuiActionParameters> {
    public constructor(eventSheet: EventSheet, args: OpenGuiActionParameters) {
        super(eventSheet, OpenGuiActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        const inventories = new Map<string, Inventory>;

        for(const [ inventoryId, inventorySource ] of Object.entries(this.args.inventories)) {
            let inventory: Inventory | null = null;

            if(inventorySource == "player_inventory" && cursor.entity instanceof Player) {
                inventory = cursor.entity.inventory;
            }
            if(inventorySource == "block_entity") {
                const blockEntity = cursor.world.getBlockEntity(
                    cursor.x + this.args.xOffset,
                    cursor.y + this.args.yOffset,
                    cursor.z + this.args.zOffset
                );
                if(blockEntity != null && blockEntity.hasInventory()) {
                    inventory = blockEntity.inventory;
                }
            }

            if(inventory !== null) {
                inventories.set(inventoryId, inventory);
            }
        }

        const guiType = guiTypeRegistry.get(this.args.gui);
        if(guiType == null) throw new ReferenceError("Unknown gui type " + this.args.gui);

        cursor.clientPlatform?.guiManager.openGui(guiType.createGui(inventories));
    }
}