import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import n from "../eventVariableTypes";
import { parameter } from "../eventVariable";

export type UsagesPredicateParameters = z.infer<typeof UsagesPredicateParameters>;
export const UsagesPredicateParameters = z.object({
    used: n.Boolean
})

export class UsagesPredicate extends EventPredicate {
    private readonly used: n.Argument<boolean>;

    public constructor(args: unknown) {
        super();

        const parsed = UsagesPredicateParameters.parse(args);
        this.used = parameter(parsed.used);
    }
    public override test(cursor: EventCursor): boolean {
        return this.used(cursor) == (cursor.usages > 0);
    }
}