import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";

export type CloneBlockActionParameters = z.infer<typeof CloneBlockActionParameters>;
export const CloneBlockActionParameters = z.object({
    from: z.tuple([ z.int(), z.int(), z.int() ]).default([0, 0, 0]),
    to: z.tuple([ z.int(), z.int(), z.int() ]).default([0, 0, 0])
});

export class CloneBlockAction extends EventAction<CloneBlockActionParameters> {
    public constructor(eventSheet: EventSheet, args: CloneBlockActionParameters) {
        super(eventSheet, CloneBlockActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        cursor.world.setBlockState(
            cursor.x + this.args.to[0],
            cursor.y + this.args.to[1],
            cursor.z + this.args.to[2],
            
            cursor.world.getBlockState(
                cursor.x + this.args.from[0],
                cursor.y + this.args.from[1],
                cursor.z + this.args.from[2]
            )
        );
    }
}