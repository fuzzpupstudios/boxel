import z from "zod";
import { InventorySlot } from "../../item/inventory";
import type { EventParamGetter } from "../eventParamGetter";
import { isInteger, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export const InventorySlotEventParamGetterParams = z.object({
    slot: n.Integer,
}).and(z.union([
    z.object({
        block_entity: z.tuple([ n.Integer, n.Integer, n.Integer ])
    })
]))

export function inventorySlotEventParamGetter(params: unknown): EventParamGetter<InventorySlot> {
    let blockEntityOffset: {
        x: n.Parameter<number>,
        y: n.Parameter<number>,
        z: n.Parameter<number>
    } | undefined;

    const parsed = InventorySlotEventParamGetterParams.parse(params);

    const slotParam = parameter(parsed.slot, isInteger);
    if(parsed.block_entity != null) {
        blockEntityOffset = {
            x: parameter(parsed.block_entity[0], isInteger),
            y: parameter(parsed.block_entity[1], isInteger),
            z: parameter(parsed.block_entity[2], isInteger)
        }
    }

    return cursor => {
        if(blockEntityOffset) {
            const blockEntity = cursor.world.getBlockEntity(
                cursor.x + blockEntityOffset.x(cursor),
                cursor.y + blockEntityOffset.y(cursor),
                cursor.z + blockEntityOffset.z(cursor)
            );

            if(blockEntity?.hasInventory()) {
                const slot = blockEntity.inventory.slots[slotParam(cursor)];

                if(slot != null) {
                    return slot;
                }
            }
        }

        return new InventorySlot();
    }
}