import type { EventCursor } from "./eventSheet";

export type EventPredicate = (cursor: EventCursor) => boolean;


export function andPredicate(predicates: EventPredicate[]): EventPredicate {
    return cursor => {
        for(const predicate of predicates) {
            if(!predicate(cursor)) return false;
        }
        return true;
    }
}

export function orPredicate(predicates: EventPredicate[]): EventPredicate {
    return cursor => {
        for(const predicate of predicates) {
            if(predicate(cursor)) return true;
        }
        return false;
    }
}

export function notPredicate(predicates: EventPredicate[]): EventPredicate {
    return cursor => {
        for(const predicate of predicates) {
            if(!predicate(cursor)) return true;
        }
        return false;
    }
}