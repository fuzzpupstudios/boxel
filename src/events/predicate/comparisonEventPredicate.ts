import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import { isNumber, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type NumericalComparisonPredicateParameters = z.infer<typeof NumericalComparisonPredicateParameters>;
export const NumericalComparisonPredicateParameters = z.tuple([
    z.number().or(n.InnerParameter),
    z.number().or(n.InnerParameter)
])

abstract class ComparisonEventPredicate extends EventPredicate {
    protected readonly a: n.Argument<number>;
    protected readonly b: n.Argument<number>;

    public constructor(args: unknown) {
        super();

        const parsed = NumericalComparisonPredicateParameters.parse(args);

        this.a = parameter(parsed[0], isNumber);
        this.b = parameter(parsed[1], isNumber);
    }
}

export class GreaterThanEventPredicate extends ComparisonEventPredicate {
    public override test(cursor: EventCursor): boolean {
        return this.a(cursor) > this.b(cursor);
    }
}

export class GreaterThanEqualsEventPredicate extends ComparisonEventPredicate {
    public override test(cursor: EventCursor): boolean {
        return this.a(cursor) >= this.b(cursor);
    }
}

export class LessThanEventPredicate extends ComparisonEventPredicate {
    public override test(cursor: EventCursor): boolean {
        return this.a(cursor) < this.b(cursor);
    }
}

export class LessThanEqualsEventPredicate extends ComparisonEventPredicate {
    public override test(cursor: EventCursor): boolean {
        return this.a(cursor) <= this.b(cursor);
    }

}

export type EqualsEventPredicateParameters = z.infer<typeof EqualsEventPredicateParameters>;
export const EqualsEventPredicateParameters = z.array(z.any());

export class EqualsEventPredicate extends EventPredicate {
    protected readonly items: n.Argument<number>[];

    public constructor(args: unknown) {
        super();

        const parsed = EqualsEventPredicateParameters.parse(args);

        this.items = parsed.map(arg => parameter(arg));
    }
    public override test(cursor: EventCursor): boolean {
        let value: any;
        let equal = true;

        for(let i = 0; i < this.items.length && equal; i++) {
            if(value == null) {
                equal &&= this.items[i](cursor) === value;
            } else {
                value = this.items[i](cursor);
            }
        }

        return equal;
    }
}