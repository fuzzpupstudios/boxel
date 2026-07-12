import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";
import type { Inventory } from "../../item/inventory";
import { Player } from "../../entity/player";
import { inventoryGuiTypeRegistry } from "../../item/inventoryGuiTypeRegistry";

export type OpenGuiActionParameters = z.infer<typeof OpenGuiActionParameters>;
export const OpenGuiActionParameters = z.object({
    gui: z.string(),
    inventory: z.enum([ "none", "player_inventory" ]).default("none")
});

export class OpenGuiAction extends EventAction<OpenGuiActionParameters> {
    public constructor(eventSheet: EventSheet, args: OpenGuiActionParameters) {
        super(eventSheet, OpenGuiActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        let inventory: Inventory | null = null;

        if(cursor.entity instanceof Player && this.args.inventory == "player_inventory") {
            inventory = cursor.entity.inventory;
        }

        const guiType = inventoryGuiTypeRegistry.get(this.args.gui);
        if(guiType == null) throw new ReferenceError("Unknown gui type " + this.args.gui);

        cursor.guiManager?.openGui(guiType.createGui(inventory));
    }
}