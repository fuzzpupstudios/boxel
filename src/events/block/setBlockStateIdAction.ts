import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import n from "../eventVariableTypes";
import { isInteger, isString, parameter } from "../eventVariable";

export type SetBlockStateIdActionParameters = z.infer<typeof SetBlockStateIdActionParameters>;
export const SetBlockStateIdActionParameters = z.object({
    xOffset: n.Integer.default(0),
    yOffset: n.Integer.default(0),
    zOffset: n.Integer.default(0),
    blockStateId: n.String,
    showParticles: n.Boolean.default(false)
});

export class SetBlockStateIdAction extends EventAction {
    private readonly xOffset: n.Argument<number>;
    private readonly yOffset: n.Argument<number>;
    private readonly zOffset: n.Argument<number>;
    private readonly blockStateId: n.Argument<string>;
    private readonly showParticles: n.Argument<boolean>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = SetBlockStateIdActionParameters.parse(args);
        this.xOffset = parameter(parsed.xOffset, isInteger);
        this.yOffset = parameter(parsed.yOffset, isInteger);
        this.zOffset = parameter(parsed.zOffset, isInteger);
        this.blockStateId = parameter(parsed.blockStateId, isString);
        this.showParticles = parameter(parsed.showParticles);
    }
    public override run(cursor: EventCursor): void {
        const x = cursor.x + this.xOffset(cursor);
        const y = cursor.y + this.yOffset(cursor);
        const z = cursor.z + this.zOffset(cursor);

        if(this.showParticles(cursor)) {
            cursor.clientPlatform?.blockBreakParticles.blockDestructionParticles(x, y, z);
        }
        cursor.world.setBlockState(x, y, z, this.blockStateId(cursor));
    }
}