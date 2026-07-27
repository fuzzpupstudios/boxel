import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { eventSheetRegistry } from "../eventSheetRegistry";

export type RunTriggerActionParameters = z.infer<typeof RunTriggerActionParameters>;
export const RunTriggerActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    self: z.boolean().default(false),
    eventSheetId: z.string().optional(),
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

        let eventSheet: EventSheet | undefined;

        if(this.args.eventSheetId != null) {
            const eventSheet = eventSheetRegistry.get(this.args.eventSheetId);
            if(eventSheet == null) throw new ReferenceError("Cannot find event sheet " + this.args.eventSheetId);
            

        } else {
            const blockStateId = cursor.world.getBlockState(
                cursor.x + xOffset,
                cursor.y + yOffset,
                cursor.z + zOffset
            );

            const blockState = blockStateRegistry.get(blockStateId);
            eventSheet = blockState?.events;
        }

        cursor.addOffset(xOffset, yOffset, zOffset);
        eventSheet?.runTrigger(triggerName, cursor);
        cursor.removeOffset(xOffset, yOffset, zOffset);
    }
}