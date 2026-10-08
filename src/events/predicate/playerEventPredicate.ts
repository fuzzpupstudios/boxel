import z from "zod";
import { Player } from "../../entity/player";
import type { EventCursor } from "../eventSheet";
import { parameter } from "../eventVariable";
import n from "../eventVariableTypes";
import { EntityEventPredicate, EntityEventPredicateParameters } from "./entityEventPredicate";

export type PlayerEventPredicateParameters = z.infer<typeof PlayerEventPredicateParameters>;
export const PlayerEventPredicateParameters = EntityEventPredicateParameters.extend({
    infiniteItems: n.Boolean.optional(),
    canFly: n.Boolean.optional(),
    instabreak: n.Boolean.optional(),
    crouching: n.Boolean.optional()
});

export class PlayerEventPredicate extends EntityEventPredicate {
    private readonly infiniteItems?: n.Argument<boolean>;
    private readonly canFly?: n.Argument<boolean>;
    private readonly instabreak?: n.Argument<boolean>;
    private readonly crouching?: n.Argument<boolean>;
    
    public constructor(args: unknown) {
        super(args);
        const parsed = PlayerEventPredicateParameters.parse(args);

        if(parsed.infiniteItems != null) this.infiniteItems = parameter(parsed.infiniteItems);
        if(parsed.canFly != null) this.canFly = parameter(parsed.canFly);
        if(parsed.instabreak != null) this.instabreak = parameter(parsed.instabreak);
        if(parsed.crouching != null) this.crouching = parameter(parsed.crouching);
    }
    public override test(cursor: EventCursor): boolean {
        if(!(cursor.entity instanceof Player)) return false;
        if(!super.test(cursor)) return false;

        if(this.infiniteItems != null) {
            if(this.infiniteItems(cursor) != cursor.entity.infiniteItems) return false;
        }
        if(this.canFly != null) {
            if(this.canFly(cursor) != cursor.entity.canFly) return false;
        }
        if(this.instabreak != null) {
            if(this.instabreak(cursor) != cursor.entity.instabreak) return false;
        }
        if(this.crouching != null) {
            if(this.crouching(cursor) != cursor.entity.crouching) return false;
        }

        return true;
    }
}