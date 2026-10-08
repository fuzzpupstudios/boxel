import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import { parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type PlatformEventPredicateParameters = z.infer<typeof PlatformEventPredicateParameters>;
export const PlatformEventPredicateParameters = z.object({
    usingTouchscreen: n.Boolean.optional()
})

export class PlatformEventPredicate extends EventPredicate {
    private readonly usingTouchscreen?: n.Argument<boolean>;

    public constructor(args: unknown) {
        super();

        const parsed = PlatformEventPredicateParameters.parse(args);

        if(parsed.usingTouchscreen != null) this.usingTouchscreen = parameter(parsed.usingTouchscreen);
    }
    public override test(cursor: EventCursor): boolean {
        if(cursor.clientPlatform == null) return false;

        if(this.usingTouchscreen != null) {
            if(this.usingTouchscreen(cursor) != cursor.clientPlatform.usingTouchscreen) return false;
        }

        return true;
    }
}