import z from "zod";
import { Player } from "../../entity/player";
import { guiTypeRegistry } from "../../gui/guiTypeRegistry";
import type { Inventory } from "../../item/inventory";
import type { EventAction } from "../eventAction";
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

export function openGuiAction(args: unknown): EventAction {
    const parsed = OpenGuiActionParameters.parse(args);

    const guiParam = parameter(parsed.gui, isString);
    const offsetXParam = parameter(parsed.xOffset, isInteger);
    const offsetYParam = parameter(parsed.yOffset, isInteger);
    const offsetZParam = parameter(parsed.zOffset, isInteger);
    const inventorySources = new Map(Object.entries(parsed.inventories));

    let blockEntityOffset: {
        offsetX: n.Parameter<number>,
        offsetY: n.Parameter<number>,
        offsetZ: n.Parameter<number>
    } | undefined;
    if(parsed.block_entity) {
        blockEntityOffset = {
            offsetX: parameter(parsed.block_entity[0], isInteger),
            offsetY: parameter(parsed.block_entity[1], isInteger),
            offsetZ: parameter(parsed.block_entity[2], isInteger)
        }
    }

    return (cursor) => {
        const inventories = new Map<string, Inventory>;

        const gui = guiParam(cursor);
        const offsetX = offsetXParam(cursor);
        const offsetY = offsetYParam(cursor);
        const offsetZ = offsetZParam(cursor);

        const { x, y, z, entity } = cursor;

        for(const [ inventoryId, inventorySource ] of inventorySources) {
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
        if(blockEntityOffset) {
            cursorData.set("$block_entity", cursor.world.getBlockEntity(
                cursor.x + blockEntityOffset.offsetX(cursor),
                cursor.y + blockEntityOffset.offsetZ(cursor),
                cursor.z + blockEntityOffset.offsetY(cursor)
            ));
        }

        cursor.clientPlatform?.guiManager.openGui(guiType.createGui(inventories, cursorData), cursor);
    }
}