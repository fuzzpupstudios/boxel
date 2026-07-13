import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";
import { blockStateRegistry } from "../../block/blockRegistry";

export type RunTriggerActionParameters = z.infer<typeof RunTriggerActionParameters>;
export const RunTriggerActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    self: z.boolean().default(false),
    triggerName: z.string()
});

export class RunTriggerAction extends EventAction<RunTriggerActionParameters> {
    public constructor(eventSheet: EventSheet, args: RunTriggerActionParameters) {
        super(eventSheet, RunTriggerActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        if(this.args.self) {
            this.eventSheet.runTrigger(this.args.triggerName, cursor);
            return;
        }

        const { xOffset, yOffset, zOffset, triggerName } = this.args;

        const blockStateId = cursor.world.getBlockState(
            cursor.x + xOffset,
            cursor.y + yOffset,
            cursor.z + zOffset
        );

        const blockState = blockStateRegistry.get(blockStateId);

        cursor.addOffset(xOffset, yOffset, zOffset);
        blockState?.events.runTrigger(triggerName, cursor);
        cursor.removeOffset(xOffset, yOffset, zOffset);
    }
}