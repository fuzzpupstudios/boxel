import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import n from "../eventVariableTypes";
import { isInteger, isPrimitive, parameter } from "../eventVariable";

export type SetBlockEntityDataActionParameters = z.infer<typeof SetBlockEntityDataActionParameters>;
export const SetBlockEntityDataActionParameters = z.object({
    xOffset: n.Number.default(0),
    yOffset: n.Number.default(0),
    zOffset: n.Number.default(0),
    data: z.record(z.string(), n.Primitive)
});

export class SetBlockEntityDataAction extends EventAction {
    private readonly xOffset: n.Argument<number>;
    private readonly yOffset: n.Argument<number>;
    private readonly zOffset: n.Argument<number>;
    private readonly data: Map<string, n.Argument<string | number | boolean>>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = SetBlockEntityDataActionParameters.parse(args);

        this.xOffset = parameter(parsed.xOffset, isInteger);
        this.yOffset = parameter(parsed.yOffset, isInteger);
        this.zOffset = parameter(parsed.zOffset, isInteger);

        this.data = new Map;
        for(const [ param, value ] of Object.entries(parsed.data)) {
            this.data.set(param, parameter(value, isPrimitive));
        }
    }
    public override run(cursor: EventCursor): void {
        const blockEntity = cursor.world.getBlockEntity(
            cursor.x + this.xOffset(cursor),
            cursor.y + this.yOffset(cursor),
            cursor.z + this.zOffset(cursor)
        );

        if(blockEntity == null) return;

        for(const [ param, value ] of this.data) {
            const calculatedValue = value(cursor);
            blockEntity.customData[param] = calculatedValue;
        }
    }
}