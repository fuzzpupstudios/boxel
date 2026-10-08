import z from "zod";
import { ItemStack } from "../../item/itemStack";
import { EventParamGetter } from "../eventParamGetter";
import type { EventCursor } from "../eventSheet";
import { isInteger, parameter } from "../eventVariable";
import n from "../eventVariableTypes";
import { InventorySlot } from "../../item/inventory";

export const SlotStackEventParamGetterParams = z.object({
    slot: n.Integer,
}).and(z.union([
    z.object({
        block_entity: z.tuple([ n.Integer, n.Integer, n.Integer ])
    })
]))

export class SlotStackEventParamGetter extends EventParamGetter<InventorySlot> {
    private readonly slot: n.Argument<number>;
    private readonly blockEntity?: {
        x: n.Argument<number>,
        y: n.Argument<number>,
        z: n.Argument<number>
    };

    public constructor(params: unknown) {
        super();
        
        const parsed = SlotStackEventParamGetterParams.parse(params);

        this.slot = parameter(parsed.slot, isInteger);
        if(parsed.block_entity != null) {
            this.blockEntity = {
                x: parameter(parsed.block_entity[0], isInteger),
                y: parameter(parsed.block_entity[1], isInteger),
                z: parameter(parsed.block_entity[2], isInteger)
            }
        }
    }
    public get(cursor: EventCursor): InventorySlot {
        if(this.blockEntity != null) {
            const blockEntity = cursor.world.getBlockEntity(
                cursor.x + this.blockEntity.x(cursor),
                cursor.y + this.blockEntity.y(cursor),
                cursor.z + this.blockEntity.z(cursor)
            );

            if(blockEntity?.hasInventory()) {
                const slot = blockEntity.inventory.slots[this.slot(cursor)];

                if(slot != null) {
                    return slot;
                }
            }
        }

        return new InventorySlot();
    }
}