import z from "zod";
import { ItemEntity } from "../../entity/item";
import { ItemStack } from "../../item/itemStack";
import type { EventAction } from "../eventAction";
import { isInteger, isNumber, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type DropBlockItemActionParameters = z.infer<typeof DropBlockItemActionParameters>;
export const DropBlockItemActionParameters = z.object({
    from: z.tuple([ n.Integer, n.Integer, n.Integer ]).default([ 0, 0, 0 ]),
    to: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 0, 0 ]),
    velocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 6, 0 ]),
    randomVelocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 2, 0, 2 ]),
    quantity: n.Integer.default(1)
});

export function dropBlockItemAction(args: unknown): EventAction {
    const parsed = DropBlockItemActionParameters.parse(args);

    const blockX = parameter(parsed.from[0], isInteger);
    const blockY = parameter(parsed.from[1], isInteger);
    const blockZ = parameter(parsed.from[2], isInteger);
    const offsetX = parameter(parsed.to[0], isNumber);
    const offsetY = parameter(parsed.to[1], isNumber);
    const offsetZ = parameter(parsed.to[2], isNumber);
    const velocityX = parameter(parsed.velocity[0], isNumber);
    const velocityY = parameter(parsed.velocity[1], isNumber);
    const velocityZ = parameter(parsed.velocity[2], isNumber);
    const randomVelocityX = parameter(parsed.randomVelocity[0], isNumber);
    const randomVelocityY = parameter(parsed.randomVelocity[1], isNumber);
    const randomVelocityZ = parameter(parsed.randomVelocity[2], isNumber);
    const quantity = parameter(parsed.quantity, isInteger);

    return (cursor) => {
        const blockStateId = cursor.world.getBlockState(
            cursor.x + blockX(cursor),
            cursor.y + blockY(cursor),
            cursor.z + blockZ(cursor)
        );

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
        const stack = ItemStack.of(blockStateId, quantity(cursor));
        entity.inventory.addStack(stack);

        cursor.world.addEntity(entity);
    }
}