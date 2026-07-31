import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { eventSheetRegistry } from "../eventSheetRegistry";

export type FullParams = z.infer<typeof FullParams>;
const FullParams = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    self: z.boolean().default(false),
    eventSheetId: z.string().optional(),
    triggerName: z.string()
});

export type RunTriggerActionParameters = z.infer<typeof RunTriggerActionParameters>;
export const RunTriggerActionParameters = FullParams.or(z.string());

export class RunTriggerAction extends EventAction<FullParams> {
    public constructor(eventSheet: EventSheet, args: any) {
        const parsedParams = RunTriggerActionParameters.parse(args);

        if(typeof parsedParams == "string") {
            super(eventSheet, FullParams.parse({ triggerName: parsedParams }));
        } else {
            super(eventSheet, FullParams.parse(parsedParams));
        }

        const groups = /^([^#]+)#(.*)$/g.exec(this.args.triggerName);
        
        if(groups) {
            const eventSheetId = groups[1];
            const triggerName = groups[2];

            if(eventSheetId == "self") {
                this.args.self = true;
                this.args.triggerName = triggerName!;
            } else {
                this.args.eventSheetId = eventSheetId;
                this.args.triggerName = triggerName!;
            }
        }
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