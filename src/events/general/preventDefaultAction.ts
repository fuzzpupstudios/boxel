import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

export class PreventDefaultAction extends EventAction {
    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);
    }
    public override run(cursor: EventCursor): void {
        cursor.preventDefault();
    }
}