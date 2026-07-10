import type { EventCursor } from "./eventSheet";

export abstract class EventPredicate<EventParameters = {}> {
    public constructor(
        protected readonly args: EventParameters
    ) {}
    public abstract test(cursor: EventCursor): boolean;
}

export class ConstantPredicate extends EventPredicate<boolean> {
    public test(cursor: EventCursor): boolean {
        return this.args;
    }
}

export class AndPredicate extends EventPredicate {
    public constructor(
        private readonly predicates: EventPredicate[]
    ) {
        super({});
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
        super({});
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