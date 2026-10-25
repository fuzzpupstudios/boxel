import z from "zod";
import type { EventPredicate } from "../eventPredicate";
import { isNumber, isParameter, parameter, parameterOuter, parameterVariable } from "../eventVariable";
import n from "../eventVariableTypes";

export type NumericalComparisonPredicateParameters = z.infer<typeof NumericalComparisonPredicateParameters>;
export const NumericalComparisonPredicateParameters = z.tuple([
    z.union([ z.number(), z.string(), n.InnerParameter ]),
    z.union([ z.number(), z.string(), n.InnerParameter ])
])

function parseComparisonOperands(args: unknown): [ n.Parameter<number>, n.Parameter<number> ] {
    const parsed = NumericalComparisonPredicateParameters.parse(args);

    return [
        typeof parsed[0] == "string" ? parameterVariable(parsed[0], isNumber) : parameter(parsed[0], isNumber),
        typeof parsed[1] == "string" ? parameterVariable(parsed[1], isNumber) : parameter(parsed[1], isNumber)
    ];
}

export function greaterThanEventPredicate(args: unknown): EventPredicate {
    const [ a, b ] = parseComparisonOperands(args);

    return (cursor) => {
        return a(cursor) > b(cursor);
    }
}

export function greaterThanEqualEventPredicate(args: unknown): EventPredicate {
    const [ a, b ] = parseComparisonOperands(args);

    return (cursor) => {
        return a(cursor) >= b(cursor);
    }
}

export function lessThanEventPredicate(args: unknown): EventPredicate {
    const [ a, b ] = parseComparisonOperands(args);

    return (cursor) => {
        return a(cursor) < b(cursor);
    }
}

export function lessThanEqualEventPredicate(args: unknown): EventPredicate {
    const [ a, b ] = parseComparisonOperands(args);

    return (cursor) => {
        return a(cursor) <= b(cursor);
    }
}

export type EqualEventPredicateParameters = z.infer<typeof EqualEventPredicateParameters>;
export const EqualEventPredicateParameters = z.array(z.any()).nonempty();

export function equalEventPredicate(args: unknown): EventPredicate {
    const parsed = EqualEventPredicateParameters.parse(args);

    const items: n.Parameter<number>[] = parsed.map(arg => isParameter(arg) ? parameterOuter(arg) : parameter(arg));

    return (cursor) => {
        let value = items[0](cursor);
        let equal = true;

        for(let i = 1; i < items.length && equal; i++) {
            equal &&= items[i](cursor) === value;
        }

        return equal;
    }
}

export function notEqualEventPredicate(args: unknown): EventPredicate {
    const parsed = EqualEventPredicateParameters.parse(args);

    const items: n.Parameter<number>[] = parsed.map(arg => parameter(arg));

    return (cursor) => {
        let value = items[0](cursor);
        let equal = true;

        for(let i = 1; i < items.length && equal; i++) {
            equal &&= items[i](cursor) === value;
        }

        return !equal;
    }
}