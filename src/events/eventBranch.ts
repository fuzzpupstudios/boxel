import type { EventAction } from "./eventAction";
import type { EventPredicate } from "./eventPredicate";

export function eventBranch(
    predicate: EventPredicate,
    ifTrueActions: EventAction[],
    ifFalseActions: EventAction[]
): EventAction {
    return (cursor) => {
        if(predicate(cursor)) {
            for(const action of ifTrueActions) action(cursor);
        } else {
            for(const action of ifFalseActions) action(cursor);
        }
    }
}