import z from "zod";
import type { EventPredicate } from "../eventPredicate";
import { parameter, parameterVariable } from "../eventVariable";
import n from "../eventVariableTypes";

export function variableExistsPredicate(args: unknown): EventPredicate {
    const parsed = z.string().or(n.InnerParameter).parse(args);

    const variable = typeof parsed == "string" ? parameterVariable(parsed) : parameter(parsed);

    return (cursor) => {
        return variable(cursor) != null;
    }
}