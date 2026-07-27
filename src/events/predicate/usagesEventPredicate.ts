import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";

export type UsagesPredicateParameters = z.infer<typeof UsagesPredicateParameters>;
export const UsagesPredicateParameters = z.object({
    used: z.boolean()
})

export class UsagesPredicate extends EventPredicate<UsagesPredicateParameters> {
    public constructor(args: UsagesPredicateParameters) {
        super(UsagesPredicateParameters.parse(args));
    }
    public override test(cursor: EventCursor): boolean {
        return this.args.used == (cursor.usages > 0);
    }
}