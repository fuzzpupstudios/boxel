import z from "zod";
import { ItemEntity } from "../../entity/item";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import n from "../eventVariableTypes";
import { isInteger, isNumber, parameter } from "../eventVariable";
import { ItemStack } from "../../item/itemStack";

export type DropBlockItemActionParameters = z.infer<typeof DropBlockItemActionParameters>;
export const DropBlockItemActionParameters = z.object({
    from: z.tuple([ n.Integer, n.Integer, n.Integer ]).default([ 0, 0, 0 ]),
    to: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 0, 0 ]),
    velocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 6, 0 ]),
    randomVelocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 2, 0, 2 ]),
    quantity: n.Integer.default(1)
});

export class DropBlockItemAction extends EventAction {
    private readonly blockX: n.Argument<number>;
    private readonly blockY: n.Argument<number>;
    private readonly blockZ: n.Argument<number>;
    private readonly offsetX: n.Argument<number>;
    private readonly offsetY: n.Argument<number>;
    private readonly offsetZ: n.Argument<number>;
    private readonly velocityX: n.Argument<number>;
    private readonly velocityY: n.Argument<number>;
    private readonly velocityZ: n.Argument<number>;
    private readonly randomVelocityX: n.Argument<number>;
    private readonly randomVelocityY: n.Argument<number>;
    private readonly randomVelocityZ: n.Argument<number>;
    private readonly quantity: n.Argument<number>;
    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = DropBlockItemActionParameters.parse(args);
        this.blockX = parameter(parsed.from[0], isInteger);
        this.blockY = parameter(parsed.from[1], isInteger);
        this.blockZ = parameter(parsed.from[2], isInteger);
        this.offsetX = parameter(parsed.to[0], isNumber);
        this.offsetY = parameter(parsed.to[1], isNumber);
        this.offsetZ = parameter(parsed.to[2], isNumber);
        this.velocityX = parameter(parsed.velocity[0], isNumber);
        this.velocityY = parameter(parsed.velocity[1], isNumber);
        this.velocityZ = parameter(parsed.velocity[2], isNumber);
        this.randomVelocityX = parameter(parsed.randomVelocity[0], isNumber);
        this.randomVelocityY = parameter(parsed.randomVelocity[1], isNumber);
        this.randomVelocityZ = parameter(parsed.randomVelocity[2], isNumber);
        this.quantity = parameter(parsed.quantity, isInteger);
    }
    public override run(cursor: EventCursor): void {
        const blockStateId = cursor.world.getBlockState(
            cursor.x + this.blockX(cursor),
            cursor.y + this.blockY(cursor),
            cursor.z + this.blockZ(cursor)
        );

        const entity = new ItemEntity(cursor.world);
        entity.position.set(
            cursor.x + this.offsetX(cursor) + 0.5,
            cursor.y + this.offsetY(cursor),
            cursor.z + this.offsetZ(cursor) + 0.5
        );
        entity.velocity.set(
            this.velocityX(cursor) + this.randomVelocityX(cursor) * (Math.random() * 2 - 1),
            this.velocityY(cursor) + this.randomVelocityY(cursor) * (Math.random() * 2 - 1),
            this.velocityZ(cursor) + this.randomVelocityZ(cursor) * (Math.random() * 2 - 1),
        );
        const stack = ItemStack.of(blockStateId, this.quantity(cursor));
        entity.inventory.addStack(stack);

        cursor.world.addEntity(entity);
    }
}