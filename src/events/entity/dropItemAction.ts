import z from "zod";
import { ItemEntity } from "../../entity/item";
import { ItemStack, SerializedItemStack } from "../../item/itemStack";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

export type DropItemActionParameters = z.infer<typeof DropItemActionParameters>;
export const DropItemActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    velocity: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0, 6, 0 ]),
    randomVelocity: z.tuple([ z.number(), z.number(), z.number() ]).default([ 2, 0, 2 ]),
    stack: z.string().or(SerializedItemStack).optional()
});

export class DropItemAction extends EventAction<DropItemActionParameters> {
    private readonly stack: ItemStack;

    public constructor(eventSheet: EventSheet, args: DropItemActionParameters) {
        super(eventSheet, DropItemActionParameters.parse(args));

        if(typeof this.args.stack === "string") {
            this.stack = ItemStack.of(this.args.stack);
        } else if(this.args.stack != null) {
            this.stack = ItemStack.of(this.args.stack.item, this.args.stack.quantity);
        } else {
            this.stack = ItemStack.empty();
        }
    }
    public override run(cursor: EventCursor): void {
        const entity = new ItemEntity(cursor.world);
        entity.position.set(
            cursor.x + this.args.xOffset + 0.5,
            cursor.y + this.args.yOffset,
            cursor.z + this.args.zOffset + 0.5
        );
        entity.velocity.set(
            this.args.velocity[0] + this.args.randomVelocity[0] * (Math.random() * 2 - 1),
            this.args.velocity[1] + this.args.randomVelocity[1] * (Math.random() * 2 - 1),
            this.args.velocity[2] + this.args.randomVelocity[2] * (Math.random() * 2 - 1),
        );
        entity.stack.copyFrom(this.stack);
        entity.updateDisplayItem();

        cursor.world.addEntity(entity);
    }
}