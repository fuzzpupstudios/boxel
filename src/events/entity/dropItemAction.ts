import z from "zod";
import { ItemEntity } from "../../entity/item";
import { ItemStack, SerializedItemStack } from "../../item/itemStack";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import n from "../eventVariableTypes";
import { isNumber, parameter, parameterItemStack } from "../eventVariable";
import type { InventorySlot } from "../../item/inventory";

export type DropItemActionParameters = z.infer<typeof DropItemActionParameters>;
export const DropItemActionParameters = z.object({
    xOffset: n.Number.default(0),
    yOffset: n.Number.default(0),
    zOffset: n.Number.default(0),
    velocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 6, 0 ]),
    randomVelocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 2, 0, 2 ]),
    stack: n.InventorySlot
});

export class DropItemAction extends EventAction {
    private readonly offsetX: n.Argument<number>;
    private readonly offsetY: n.Argument<number>;
    private readonly offsetZ: n.Argument<number>;
    private readonly velocityX: n.Argument<number>;
    private readonly velocityY: n.Argument<number>;
    private readonly velocityZ: n.Argument<number>;
    private readonly randomVelocityX: n.Argument<number>;
    private readonly randomVelocityY: n.Argument<number>;
    private readonly randomVelocityZ: n.Argument<number>;
    private readonly slot: n.Argument<InventorySlot>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);
        const parsed = DropItemActionParameters.parse(args);

        this.offsetX = parameter(parsed.xOffset, isNumber);
        this.offsetY = parameter(parsed.yOffset, isNumber);
        this.offsetZ = parameter(parsed.zOffset, isNumber);
        this.velocityX = parameter(parsed.velocity[0], isNumber);
        this.velocityY = parameter(parsed.velocity[1], isNumber);
        this.velocityZ = parameter(parsed.velocity[2], isNumber);
        this.randomVelocityX = parameter(parsed.randomVelocity[0], isNumber);
        this.randomVelocityY = parameter(parsed.randomVelocity[1], isNumber);
        this.randomVelocityZ = parameter(parsed.randomVelocity[2], isNumber);
        this.slot = parameterItemStack(parsed.stack);
    }
    public override run(cursor: EventCursor): void {
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
        const slot = this.slot(cursor);
        entity.slot.stack.swap(slot.stack);
        slot.processChange(cursor);
        entity.slot.processChange(cursor);

        cursor.world.addEntity(entity);
    }
}