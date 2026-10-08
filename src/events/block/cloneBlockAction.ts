import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import n from "../eventVariableTypes";
import { isInteger, parameter } from "../eventVariable";

export type CloneBlockActionParameters = z.infer<typeof CloneBlockActionParameters>;
export const CloneBlockActionParameters = z.object({
    from: z.tuple([ n.Integer, n.Integer, n.Integer ]).default([0, 0, 0]),
    to: z.tuple([ n.Integer, n.Integer, n.Integer ]).default([0, 0, 0])
});

export class CloneBlockAction extends EventAction {
    private readonly fromX: n.Argument<number>;
    private readonly fromY: n.Argument<number>;
    private readonly fromZ: n.Argument<number>;
    private readonly toX: n.Argument<number>;
    private readonly toY: n.Argument<number>;
    private readonly toZ: n.Argument<number>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = CloneBlockActionParameters.parse(args);
        
        this.fromX = parameter(parsed.from[0], isInteger);
        this.fromY = parameter(parsed.from[1], isInteger);
        this.fromZ = parameter(parsed.from[2], isInteger);
        this.toX = parameter(parsed.to[0], isInteger);
        this.toY = parameter(parsed.to[1], isInteger);
        this.toZ = parameter(parsed.to[2], isInteger);
    }
    public override run(cursor: EventCursor): void {
        cursor.world.setBlockState(
            cursor.x + this.toX(cursor),
            cursor.y + this.toY(cursor),
            cursor.z + this.toZ(cursor),
            
            cursor.world.getBlockState(
                cursor.x + this.fromX(cursor),
                cursor.y + this.fromY(cursor),
                cursor.z + this.fromZ(cursor)
            )
        );
    }
}