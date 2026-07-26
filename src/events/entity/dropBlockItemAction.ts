import z from "zod";
import { ItemEntity } from "../../entity/item";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

export type DropBlockItemActionParameters = z.infer<typeof DropBlockItemActionParameters>;
export const DropBlockItemActionParameters = z.object({
    from: z.tuple([ z.int(), z.int(), z.int() ]).default([ 0, 0, 0 ]),
    to: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0, 0, 0 ]),
    velocity: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0, 6, 0 ]),
    randomVelocity: z.tuple([ z.number(), z.number(), z.number() ]).default([ 2, 0, 2 ]),
    quantity: z.int().default(1)
});

export class DropBlockItemAction extends EventAction<DropBlockItemActionParameters> {
    public constructor(eventSheet: EventSheet, args: DropBlockItemActionParameters) {
        super(eventSheet, DropBlockItemActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        const blockStateId = cursor.world.getBlockState(
            cursor.x + this.args.from[0],
            cursor.y + this.args.from[1],
            cursor.z + this.args.from[2]
        );

        const entity = new ItemEntity(cursor.world);
        entity.position.set(
            cursor.x + this.args.to[0] + 0.5,
            cursor.y + this.args.to[1],
            cursor.z + this.args.to[2] + 0.5
        );
        entity.velocity.set(
            this.args.velocity[0] + this.args.randomVelocity[0] * (Math.random() * 2 - 1),
            this.args.velocity[1] + this.args.randomVelocity[1] * (Math.random() * 2 - 1),
            this.args.velocity[2] + this.args.randomVelocity[2] * (Math.random() * 2 - 1),
        );
        entity.stack.set(blockStateId, this.args.quantity);
        entity.updateDisplayItem();

        cursor.world.addEntity(entity);
    }
}