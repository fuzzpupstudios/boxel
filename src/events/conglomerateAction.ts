import type { EventAction } from "./eventAction";

export function conglomerateAction(actions: EventAction[]): EventAction {
    return (cursor) => {
        for(const action of actions) action(cursor);
    }
}