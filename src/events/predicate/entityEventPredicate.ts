import { MathUtils } from "three";
import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";

export type EntityEventPredicateParameters = z.infer<typeof EntityEventPredicateParameters>;
export const EntityEventPredicateParameters = z.object({
    minYaw: z.number().default(-Infinity),
    maxYaw: z.number().default(Infinity),
    minPitch: z.number().default(-Infinity),
    maxPitch: z.number().default(Infinity),
    flying: z.boolean().optional(),
    gliding: z.boolean().optional(),
});

export class EntityEventPredicate extends EventPredicate<EntityEventPredicateParameters> {
    public constructor(args: EntityEventPredicateParameters) {
        super(EntityEventPredicateParameters.parse(args));
    }
    private normalizeAngle(angle: number): number {
        return MathUtils.euclideanModulo(angle + 180, 360) - 180;
    }
    private angleBetween(angle: number, min: number, max: number): boolean {
        const a = this.normalizeAngle(angle);
        const lo = isFinite(min) ? this.normalizeAngle(min) : min;
        const hi = isFinite(max) ? this.normalizeAngle(max) : max;
        if (lo <= hi) {
            return a >= lo && a <= hi;
        } else {
            return a >= lo || a <= hi;
        }
    }
    public override test(cursor: EventCursor): boolean {
        if(cursor.entity == null) return false;

        if(!this.angleBetween(
            cursor.yaw * 180 / Math.PI,
            this.args.minYaw, this.args.maxYaw
        )) return false;

        if(!this.angleBetween(
            cursor.pitch * 180 / Math.PI,
            this.args.minPitch, this.args.maxPitch
        )) return false;

        if(this.args.flying != null) {
            if(this.args.flying != cursor.entity.flying) return false;
        }
        if(this.args.gliding != null) {
            if(this.args.gliding != cursor.entity.gliding) return false;
        }

        return true;
    }
}