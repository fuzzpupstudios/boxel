import z from "zod";
import { Player } from "../../entity/player";
import type { EventPredicate } from "../eventPredicate";
import { parameter } from "../eventVariable";
import n from "../eventVariableTypes";
import { entityEventPredicate, EntityEventPredicateParameters } from "./entityEventPredicate";

export type PlayerEventPredicateParameters = z.infer<typeof PlayerEventPredicateParameters>;
export const PlayerEventPredicateParameters = EntityEventPredicateParameters.extend({
    infiniteItems: n.Boolean.optional(),
    canFly: n.Boolean.optional(),
    instabreak: n.Boolean.optional(),
    crouching: n.Boolean.optional()
});

export function playerEventPredicate(args: unknown): EventPredicate {
    const entityPredicate = entityEventPredicate(args);
    const parsed = PlayerEventPredicateParameters.parse(args);

    const infiniteItems = parsed.infiniteItems != null ? parameter(parsed.infiniteItems) : undefined;
    const canFly = parsed.canFly != null ? parameter(parsed.canFly) : undefined;
    const instabreak = parsed.instabreak != null ? parameter(parsed.instabreak) : undefined;
    const crouching = parsed.crouching != null ? parameter(parsed.crouching) : undefined;

    return (cursor) => {
        if(!(cursor.entity instanceof Player)) return false;
        if(!entityPredicate(cursor)) return false;

        if(infiniteItems != null) {
            if(infiniteItems(cursor) != cursor.entity.infiniteItems) return false;
        }
        if(canFly != null) {
            if(canFly(cursor) != cursor.entity.canFly) return false;
        }
        if(instabreak != null) {
            if(instabreak(cursor) != cursor.entity.instabreak) return false;
        }
        if(crouching != null) {
            if(crouching(cursor) != cursor.entity.crouching) return false;
        }

        return true;
    }
}