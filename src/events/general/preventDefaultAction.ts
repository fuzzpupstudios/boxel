import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

export type PreventDefaultActionParameters = z.infer<typeof PreventDefaultActionParameters>;
export const PreventDefaultActionParameters = z.object().default({});

export class PreventDefaultAction extends EventAction<PreventDefaultActionParameters> {
    public constructor(eventSheet: EventSheet, args: PreventDefaultActionParameters) {
        super(eventSheet, PreventDefaultActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        cursor.preventDefault();
    }
}