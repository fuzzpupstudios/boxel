import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export class DebugLogAction extends EventAction {
    private readonly text: n.Argument<string>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = n.String.parse(args);

        this.text = parameter(parsed);
    }
    public override run(cursor: EventCursor): void {
        console.log(this.text(cursor));
    }
}