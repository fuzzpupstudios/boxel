import z from "zod";
import { ItemEntity } from "../../entity/item";
import type { EventAction } from "../eventAction";
import { isNumber, parameter, parameterInventorySlot } from "../eventVariable";
import n from "../eventVariableTypes";

export type DropItemActionParameters = z.infer<typeof DropItemActionParameters>;
export const DropItemActionParameters = z.object({
    xOffset: n.Number.default(0),
    yOffset: n.Number.default(0),
    zOffset: n.Number.default(0),
    velocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 6, 0 ]),
    randomVelocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 2, 0, 2 ]),
    stack: n.InventorySlot
});

export function dropItemAction(args: unknown): EventAction {
    const parsed = DropItemActionParameters.parse(args);

    const offsetX = parameter(parsed.xOffset, isNumber);
    const offsetY = parameter(parsed.yOffset, isNumber);
    const offsetZ = parameter(parsed.zOffset, isNumber);
    const velocityX = parameter(parsed.velocity[0], isNumber);
    const velocityY = parameter(parsed.velocity[1], isNumber);
    const velocityZ = parameter(parsed.velocity[2], isNumber);
    const randomVelocityX = parameter(parsed.randomVelocity[0], isNumber);
    const randomVelocityY = parameter(parsed.randomVelocity[1], isNumber);
    const randomVelocityZ = parameter(parsed.randomVelocity[2], isNumber);
    const slotParam = parameterInventorySlot(parsed.stack);

    return (cursor) => {
        const entity = new ItemEntity(cursor.world);
        entity.position.set(
            cursor.x + offsetX(cursor) + 0.5,
            cursor.y + offsetY(cursor),
            cursor.z + offsetZ(cursor) + 0.5
        );
        entity.velocity.set(
            velocityX(cursor) + randomVelocityX(cursor) * (Math.random() * 2 - 1),
            velocityY(cursor) + randomVelocityY(cursor) * (Math.random() * 2 - 1),
            velocityZ(cursor) + randomVelocityZ(cursor) * (Math.random() * 2 - 1),
        );
        const slot = slotParam(cursor);

        entity.inventory.addStack(slot.stack);
        slot.update();

        cursor.world.addEntity(entity);
    }
}