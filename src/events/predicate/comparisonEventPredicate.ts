import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import { isNumber, parameter, parameterVariable } from "../eventVariable";
import n from "../eventVariableTypes";

export type NumericalComparisonPredicateParameters = z.infer<typeof NumericalComparisonPredicateParameters>;
export const NumericalComparisonPredicateParameters = z.tuple([
    z.union([ z.number(), z.string(), n.InnerParameter ]),
    z.union([ z.number(), z.string(), n.InnerParameter ])
])

abstract class ComparisonEventPredicate extends EventPredicate {
    protected readonly a: n.Argument<number>;
    protected readonly b: n.Argument<number>;

    public constructor(args: unknown) {
        super();

        const parsed = NumericalComparisonPredicateParameters.parse(args);

        this.a = typeof parsed[0] == "string" ? parameterVariable(parsed[0], isNumber) : parameter(parsed[0], isNumber);
        this.b = typeof parsed[1] == "string" ? parameterVariable(parsed[1], isNumber) : parameter(parsed[1], isNumber);
    }
}

export class GreaterThanEventPredicate extends ComparisonEventPredicate {
    public override test(cursor: EventCursor): boolean {
        return this.a(cursor) > this.b(cursor);
    }
}

export class GreaterThanEqualEventPredicate extends ComparisonEventPredicate {
    public override test(cursor: EventCursor): boolean {
        return this.a(cursor) >= this.b(cursor);
    }
}

export class LessThanEventPredicate extends ComparisonEventPredicate {
    public override test(cursor: EventCursor): boolean {
        return this.a(cursor) < this.b(cursor);
    }
}

export class LessThanEqualEventPredicate extends ComparisonEventPredicate {
    public override test(cursor: EventCursor): boolean {
        return this.a(cursor) <= this.b(cursor);
    }

}

export type EqualEventPredicateParameters = z.infer<typeof EqualEventPredicateParameters>;
export const EqualEventPredicateParameters = z.array(z.any()).nonempty();

export class EqualEventPredicate extends EventPredicate {
    protected readonly items: n.Argument<number>[];

    public constructor(args: unknown) {
        super();

        const parsed = EqualEventPredicateParameters.parse(args);

        this.items = parsed.map(arg => parameter(arg));
    }
    public override test(cursor: EventCursor): boolean {
        let value = this.items[0](cursor);
        let equal = true;

        for(let i = 1; i < this.items.length && equal; i++) {
            equal &&= this.items[i](cursor) === value;
        }

        return equal;
    }
}