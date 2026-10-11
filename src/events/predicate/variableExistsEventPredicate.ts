import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import { parameter, parameterVariable } from "../eventVariable";
import n from "../eventVariableTypes";

export class VariableExistsPredicate extends EventPredicate {
    private readonly variable: n.Argument<any>;

    public constructor(args: unknown) {
        super();

        const parsed = z.string().or(n.InnerParameter).parse(args);
        this.variable = typeof parsed == "string" ? parameterVariable(parsed) : parameter(parsed);
    }
    public override test(cursor: EventCursor): boolean {
        return this.variable(cursor) != null;
    }
}