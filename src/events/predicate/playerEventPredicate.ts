import z from "zod";
import { Player } from "../../entity/player";
import type { EventCursor } from "../eventSheet";
import { EntityEventPredicate, EntityEventPredicateParameters } from "./entityEventPredicate";

export type PlayerEventPredicateParameters = z.infer<typeof PlayerEventPredicateParameters>;
export const PlayerEventPredicateParameters = EntityEventPredicateParameters.extend({
    infiniteItems: z.boolean().optional(),
    canFly: z.boolean().optional(),
    instabreak: z.boolean().optional(),
    crouching: z.boolean().optional()
});

export class PlayerEventPredicate extends EntityEventPredicate {
    protected override readonly args: PlayerEventPredicateParameters;

    public constructor(args: PlayerEventPredicateParameters) {
        super(args);
        this.args = PlayerEventPredicateParameters.parse(args);
    }
    public override test(cursor: EventCursor): boolean {
        if(!(cursor.entity instanceof Player)) return false;
        if(!super.test(cursor)) return false;

        if(this.args.infiniteItems != null) {
            if(this.args.infiniteItems != cursor.entity.infiniteItems) return false;
        }
        if(this.args.canFly != null) {
            if(this.args.canFly != cursor.entity.canFly) return false;
        }
        if(this.args.instabreak != null) {
            if(this.args.instabreak != cursor.entity.instabreak) return false;
        }
        if(this.args.crouching != null) {
            if(this.args.crouching != cursor.entity.crouching) return false;
        }

        return true;
    }
}