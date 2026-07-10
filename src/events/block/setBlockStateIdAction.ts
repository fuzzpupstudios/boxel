import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";

export type SetBlockStateIdActionParameters = z.infer<typeof SetBlockStateIdActionParameters>;
export const SetBlockStateIdActionParameters = z.object({
    xOffset: z.number(),
    yOffset: z.number(),
    zOffset: z.number(),
    blockStateId: z.string()
});

export class SetBlockStateIdAction extends EventAction<SetBlockStateIdActionParameters> {
    public constructor(eventSheet: EventSheet, args: SetBlockStateIdActionParameters) {
        super(eventSheet, SetBlockStateIdActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        cursor.world.setBlockState(
            cursor.x + this.args.xOffset,
            cursor.y + this.args.yOffset,
            cursor.z + this.args.zOffset,
            this.args.blockStateId
        );
    }
}