import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";
import type { Inventory } from "../../item/inventory";
import { Player } from "../../entity/player";
import { inventoryGuiTypeRegistry } from "../../item/inventoryGuiTypeRegistry";

export type OpenGuiActionParameters = z.infer<typeof OpenGuiActionParameters>;
export const OpenGuiActionParameters = z.object({
    gui: z.string(),
    xOffset: z.int().default(0),
    yOffset: z.int().default(0),
    zOffset: z.int().default(0),
    inventory: z.enum([ "none", "player_inventory", "block_entity" ]).default("none")
});

export class OpenGuiAction extends EventAction<OpenGuiActionParameters> {
    public constructor(eventSheet: EventSheet, args: OpenGuiActionParameters) {
        super(eventSheet, OpenGuiActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        let inventory: Inventory | null = null;

        if(this.args.inventory == "player_inventory" && cursor.entity instanceof Player) {
            inventory = cursor.entity.inventory;
        }
        if(this.args.inventory == "block_entity") {
            const blockEntity = cursor.world.getBlockEntity(
                cursor.x + this.args.xOffset,
                cursor.y + this.args.yOffset,
                cursor.z + this.args.zOffset
            );
            if(blockEntity != null && blockEntity.hasInventory()) {
                inventory = blockEntity.inventory;
            }
        }

        const guiType = inventoryGuiTypeRegistry.get(this.args.gui);
        if(guiType == null) throw new ReferenceError("Unknown gui type " + this.args.gui);

        cursor.clientPlatform?.guiManager.openGui(guiType.createGui(inventory));
    }
}