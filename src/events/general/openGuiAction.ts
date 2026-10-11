import z from "zod";
import { Player } from "../../entity/player";
import { guiTypeRegistry } from "../../gui/guiTypeRegistry";
import type { Inventory } from "../../item/inventory";
import { EventAction } from "../eventAction";
import { EventCursor, type EventSheet } from "../eventSheet";
import { isInteger, isString, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type OpenGuiActionParameters = z.infer<typeof OpenGuiActionParameters>;
export const OpenGuiActionParameters = z.object({
    gui: n.String,
    xOffset: n.Integer.default(0),
    yOffset: n.Integer.default(0),
    zOffset: n.Integer.default(0),
    inventories: z.record(
        z.string(),
        z.enum([ "none", "player_inventory", "block_entity" ])
    ).default({}),
    block_entity: z.tuple([ n.Integer, n.Integer, n.Integer ]).optional()
});

export class OpenGuiAction extends EventAction {
    private readonly gui: n.Argument<string>;
    private readonly offsetX: n.Argument<number>;
    private readonly offsetY: n.Argument<number>;
    private readonly offsetZ: n.Argument<number>;
    private readonly inventories: Map<string, "none" | "player_inventory" | "block_entity">;
    private readonly blockEntity?: {
        offsetX: n.Argument<number>,
        offsetY: n.Argument<number>,
        offsetZ: n.Argument<number>
    };
    

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);
        const parsed = OpenGuiActionParameters.parse(args);

        this.gui = parameter(parsed.gui, isString);
        this.offsetX = parameter(parsed.xOffset, isInteger);
        this.offsetY = parameter(parsed.yOffset, isInteger);
        this.offsetZ = parameter(parsed.zOffset, isInteger);
        this.inventories = new Map(Object.entries(parsed.inventories));

        if(parsed.block_entity) {
            this.blockEntity = {
                offsetX: parameter(parsed.block_entity[0], isInteger),
                offsetY: parameter(parsed.block_entity[1], isInteger),
                offsetZ: parameter(parsed.block_entity[2], isInteger)
            }
        }
    }
    public override run(cursor: EventCursor): void {
        const inventories = new Map<string, Inventory>;

        const gui = this.gui(cursor);
        const offsetX = this.offsetX(cursor);
        const offsetY = this.offsetY(cursor);
        const offsetZ = this.offsetZ(cursor);

        const { x, y, z, entity } = cursor;

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

        const cursorData = new Map<string, any>;
        if(this.blockEntity) {
            cursorData.set("$block_entity", cursor.world.getBlockEntity(
                cursor.x + this.blockEntity.offsetX(cursor),
                cursor.y + this.blockEntity.offsetZ(cursor),
                cursor.z + this.blockEntity.offsetY(cursor)
            ));
        }

        cursor.clientPlatform?.guiManager.openGui(guiType.createGui(inventories, cursorData), cursor);
    }
}