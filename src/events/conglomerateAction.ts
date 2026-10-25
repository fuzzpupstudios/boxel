import { EventAction } from "./eventAction";
import type { EventCursor, EventSheet } from "./eventSheet";

export class ConglomerateAction extends EventAction {
    public run(cursor: EventCursor): void {
        for(const action of this.actions) action.run(cursor);
    }
    public constructor(
        eventSheet: EventSheet,
        public readonly actions: EventAction[],
    ) {
        super(eventSheet);
    }
}