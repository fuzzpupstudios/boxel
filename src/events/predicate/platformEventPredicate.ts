import z from "zod";
import type { EventPredicate } from "../eventPredicate";
import { parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type PlatformEventPredicateParameters = z.infer<typeof PlatformEventPredicateParameters>;
export const PlatformEventPredicateParameters = z.object({
    usingTouchscreen: n.Boolean.optional()
})

export function platformEventPredicate(args: unknown): EventPredicate {
    const parsed = PlatformEventPredicateParameters.parse(args);

    const usingTouchscreen = parsed.usingTouchscreen != null ? parameter(parsed.usingTouchscreen) : undefined;

    return (cursor) => {
        if(cursor.clientPlatform == null) return false;

        if(usingTouchscreen != null) {
            if(usingTouchscreen(cursor) != cursor.clientPlatform.usingTouchscreen) return false;
        }

        return true;
    }
}