import { EventAction } from "./eventAction";
import type { EventPredicate } from "./eventPredicate";
import type { EventCursor } from "./eventSheet";

export class EventBranch extends EventAction {
    public run(cursor: EventCursor): void {
        if(this.predicate.test(cursor)) {
            for(const action of this.ifTrueActions) action.run(cursor);
        } else {
            for(const action of this.ifFalseActions) action.run(cursor);
        }
    }
    public constructor(
        public readonly predicate: EventPredicate,
        public readonly ifTrueActions: EventAction[],
        public readonly ifFalseActions: EventAction[]
    ) {
        super(null!, {});
    }
}