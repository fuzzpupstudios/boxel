import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";

export type SetBlockStateIdActionParameters = z.infer<typeof SetBlockStateIdActionParameters>;
export const SetBlockStateIdActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    blockStateId: z.string(),
    showParticles: z.boolean().default(false)
});

export class SetBlockStateIdAction extends EventAction<SetBlockStateIdActionParameters> {
    public constructor(eventSheet: EventSheet, args: SetBlockStateIdActionParameters) {
        super(eventSheet, SetBlockStateIdActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        const x = cursor.x + this.args.xOffset;
        const y = cursor.y + this.args.yOffset;
        const z = cursor.z + this.args.zOffset;

        if(this.args.showParticles) {
            cursor.clientPlatform?.blockBreakParticles?.blockDestructionParticles(x, y, z);
        }
        cursor.world.setBlockState(x, y, z, this.args.blockStateId);
    }
}