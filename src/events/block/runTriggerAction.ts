import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { EventAction } from "../eventAction";
import type { EventSheet } from "../eventSheet";
import { eventSheetRegistry } from "../eventSheetRegistry";
import { isInteger, isString, parameter } from "../eventVariable";
import n from "../eventVariableTypes";


export type RunTriggerActionParameters = z.infer<typeof RunTriggerActionParameters>;
export const RunTriggerActionParameters = z.object({
    xOffset: n.Number.default(0),
    yOffset: n.Number.default(0),
    zOffset: n.Number.default(0),
    self: n.Boolean.default(false),
    eventSheetId: z.string().optional(),
    triggerName: n.String
});

export function runTriggerAction(args: unknown, eventSheet: EventSheet): EventAction {
    const parsed = RunTriggerActionParameters.parse(typeof args == "string" ? { triggerName: args } : args);

    const xOffsetParam = parameter(parsed.xOffset, isInteger);
    const yOffsetParam = parameter(parsed.yOffset, isInteger);
    const zOffsetParam = parameter(parsed.zOffset, isInteger);
    let self = parameter(parsed.self);
    let eventSheetIdParam: n.Parameter<string> | undefined;
    let triggerNameParam: n.Parameter<string>;
    if(parsed.eventSheetId != null) eventSheetIdParam = parameter(parsed.eventSheetId, isString);

    if(typeof parsed.triggerName == "string") {
        const groups = /^([^#]+)#(.*)$/g.exec(parsed.triggerName);

        if(groups) {
            const eventSheetId = groups[1];
            const triggerName = groups[2];

            if(eventSheetId == "self") {
                self = parameter(true);
            } else if(eventSheetId != null) {
                eventSheetIdParam = parameter(eventSheetId);
            }
            triggerNameParam = parameter(triggerName);
        } else {
            triggerNameParam = parameter(parsed.triggerName);
        }
    } else {
        triggerNameParam = parameter(parsed.triggerName, isString);
    }

    return (cursor) => {
        const triggerName = triggerNameParam(cursor);

        if(self(cursor)) {
            eventSheet.runTrigger(triggerName, cursor);
            return;
        }

        const xOffset = xOffsetParam(cursor);
        const yOffset = yOffsetParam(cursor);
        const zOffset = zOffsetParam(cursor);

        let targetEventSheet: EventSheet | null = null;

        if(eventSheetIdParam) {
            const eventSheetId = eventSheetIdParam(cursor);
            targetEventSheet = eventSheetRegistry.get(eventSheetId);
            if(targetEventSheet == null) throw new ReferenceError("Cannot find event sheet " + eventSheetId);
        } else {
            const blockStateId = cursor.world.getBlockState(
                cursor.x + xOffset,
                cursor.y + yOffset,
                cursor.z + zOffset
            );

            const blockState = blockStateRegistry.get(blockStateId);
            if(blockState) {
                targetEventSheet = blockState.events;
            }
        }

        if(!targetEventSheet) return;

        cursor.addOffset(xOffset, yOffset, zOffset);
        targetEventSheet.runTrigger(triggerName, cursor);
        cursor.removeOffset(xOffset, yOffset, zOffset);
    }
}