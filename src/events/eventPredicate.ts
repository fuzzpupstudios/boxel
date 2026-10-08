import type { EventCursor } from "./eventSheet";

export abstract class EventPredicate {
    public abstract test(cursor: EventCursor): boolean;
}

export class ConstantPredicate extends EventPredicate {
    constructor(public readonly value: boolean) {
        super();
    }
    public test(cursor: EventCursor): boolean {
        return this.value;
    }
}

export class AndPredicate extends EventPredicate {
    public constructor(
        private readonly predicates: EventPredicate[]
    ) {
        super();
    }
    public test(cursor: EventCursor): boolean {
        for(const predicate of this.predicates) {
            if(!predicate.test(cursor)) return false;
        }
        return true;
    }
}

export class OrPredicate extends EventPredicate {
    public constructor(
        private readonly predicates: EventPredicate[]
    ) {
        super();
    }
    public test(cursor: EventCursor): boolean {
        for(const predicate of this.predicates) {
            if(predicate.test(cursor)) return true;
        }
        return false;
    }
}

export class NotPredicate extends AndPredicate {
    public test(cursor: EventCursor): boolean {
        return !super.test(cursor);
    }
}