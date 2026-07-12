import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";

export type PlatformEventPredicateParameters = z.infer<typeof PlatformEventPredicateParameters>;
export const PlatformEventPredicateParameters = z.object({
    usingTouchscreen: z.boolean().optional()
})

export class PlatformEventPredicate extends EventPredicate<PlatformEventPredicateParameters> {
    public constructor(args: PlatformEventPredicateParameters) {
        super(PlatformEventPredicateParameters.parse(args));
    }
    public override test(cursor: EventCursor): boolean {
        if(cursor.clientPlatform == null) return false;

        if(this.args.usingTouchscreen != null) {
            if(this.args.usingTouchscreen != cursor.clientPlatform.usingTouchscreen) return false;
        }

        return true;
    }
}