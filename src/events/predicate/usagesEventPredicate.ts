import z from "zod";
import type { EventPredicate } from "../eventPredicate";
import { parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type UsagesPredicateParameters = z.infer<typeof UsagesPredicateParameters>;
export const UsagesPredicateParameters = z.object({
    used: n.Boolean
})

export function usagesPredicate(args: unknown): EventPredicate {
    const parsed = UsagesPredicateParameters.parse(args);

    const used = parameter(parsed.used);

    return (cursor) => {
        return used(cursor) == (cursor.usages > 0);
    }
}