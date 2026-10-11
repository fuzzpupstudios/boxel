import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { eventSheetRegistry } from "../eventSheetRegistry";
import n from "../eventVariableTypes";
import { isInteger, isString, parameter } from "../eventVariable";


export type RunTriggerActionParameters = z.infer<typeof RunTriggerActionParameters>;
export const RunTriggerActionParameters = z.object({
    xOffset: n.Number.default(0),
    yOffset: n.Number.default(0),
    zOffset: n.Number.default(0),
    self: n.Boolean.default(false),
    eventSheetId: z.string().optional(),
    triggerName: n.String
});

export class RunTriggerAction extends EventAction {
    private readonly xOffset: n.Argument<number>;
    private readonly yOffset: n.Argument<number>;
    private readonly zOffset: n.Argument<number>;
    private readonly self: n.Argument<boolean>;
    private readonly eventSheetId?: n.Argument<string>;
    private readonly triggerName: n.Argument<string>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = RunTriggerActionParameters.parse(typeof args == "string" ? { triggerName: args } : args);

        this.xOffset = parameter(parsed.xOffset, isInteger);
        this.yOffset = parameter(parsed.yOffset, isInteger);
        this.zOffset = parameter(parsed.zOffset, isInteger);
        this.self = parameter(parsed.self);
        if(parsed.eventSheetId != null) this.eventSheetId = parameter(parsed.eventSheetId, isString);

        if(typeof parsed.triggerName == "string") {
            const groups = /^([^#]+)#(.*)$/g.exec(parsed.triggerName);
            
            if(groups) {
                const eventSheetId = groups[1];
                const triggerName = groups[2];

                if(eventSheetId == "self") {
                    this.self = parameter(true);
                } else if(eventSheetId != null) {
                    this.eventSheetId = parameter(eventSheetId);
                }
                this.triggerName = parameter(triggerName);
            } else {
                this.triggerName = parameter(parsed.triggerName);
            }
        } else {
            this.triggerName = parameter(parsed.triggerName, isString);
        }
    }
    public override run(cursor: EventCursor): void {
        const triggerName = this.triggerName(cursor);

        if(this.self(cursor)) {
            this.eventSheet.runTrigger(triggerName, cursor);
            return;
        }

        const xOffset = this.xOffset(cursor);
        const yOffset = this.yOffset(cursor);
        const zOffset = this.zOffset(cursor);

        let eventSheet: EventSheet | null = null;

        if(this.eventSheetId) {
            const eventSheetId = this.eventSheetId(cursor);
            eventSheet = eventSheetRegistry.get(eventSheetId);
            if(eventSheet == null) throw new ReferenceError("Cannot find event sheet " + eventSheetId);
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
        eventSheet.runTrigger(triggerName, cursor);
        cursor.removeOffset(xOffset, yOffset, zOffset);
    }
}