import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { eventSheetRegistry } from "../eventSheetRegistry";
import n from "../eventVariableTypes";
import { isInteger, parameter } from "../eventVariable";


export type RunTriggerActionParameters = z.infer<typeof RunTriggerActionParameters>;
export const RunTriggerActionParameters = z.object({
    xOffset: n.Number.default(0),
    yOffset: n.Number.default(0),
    zOffset: n.Number.default(0),
    self: n.Boolean.default(false),
    eventSheetId: z.string().optional(),
    triggerName: z.string()
});

export class RunTriggerAction extends EventAction {
    private readonly xOffset: n.Argument<number>;
    private readonly yOffset: n.Argument<number>;
    private readonly zOffset: n.Argument<number>;
    private readonly self: n.Argument<boolean>;
    private readonly eventSheetId: string | null;
    private readonly triggerName: string;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = RunTriggerActionParameters.parse(typeof args == "string" ? { triggerName: args } : args);

        this.xOffset = parameter(parsed.xOffset, isInteger);
        this.yOffset = parameter(parsed.yOffset, isInteger);
        this.zOffset = parameter(parsed.zOffset, isInteger);
        this.self = parameter(parsed.self);
        this.eventSheetId = parsed.eventSheetId ?? null;
        this.triggerName = parsed.triggerName;

        const groups = /^([^#]+)#(.*)$/g.exec(parsed.triggerName);
        
        if(groups) {
            const eventSheetId = groups[1];
            const triggerName = groups[2];

            if(eventSheetId == "self") {
                this.self = parameter(true);
                this.triggerName = triggerName!;
            } else {
                this.eventSheetId = eventSheetId ?? null;
                this.triggerName = triggerName!;
            }
        }
    }
    public override run(cursor: EventCursor): void {
        if(this.self(cursor)) {
            this.eventSheet.runTrigger(this.triggerName, cursor);
            return;
        }

        const xOffset = this.xOffset(cursor);
        const yOffset = this.yOffset(cursor);
        const zOffset = this.zOffset(cursor);

        let eventSheet: EventSheet | null = null;

        if(this.eventSheetId != null) {
            eventSheet = eventSheetRegistry.get(this.eventSheetId);
            if(eventSheet == null) throw new ReferenceError("Cannot find event sheet " + this.eventSheetId);
        } else {
            const blockStateId = cursor.world.getBlockState(
                cursor.x + xOffset,
                cursor.y + yOffset,
                cursor.z + zOffset
            );

            const blockState = blockStateRegistry.get(blockStateId);
            if(blockState) {
                eventSheet = blockState.events;
            }
        }

        if(!eventSheet) return;

        cursor.addOffset(xOffset, yOffset, zOffset);
        eventSheet.runTrigger(this.triggerName, cursor);
        cursor.removeOffset(xOffset, yOffset, zOffset);
    }
}