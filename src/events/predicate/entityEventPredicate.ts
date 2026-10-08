import { MathUtils } from "three";
import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import n from "../eventVariableTypes";
import { isNumber, parameter } from "../eventVariable";

export type EntityEventPredicateParameters = z.infer<typeof EntityEventPredicateParameters>;
export const EntityEventPredicateParameters = z.object({
    minYaw: z.number().default(-Infinity),
    maxYaw: z.number().default(Infinity),
    minPitch: z.number().default(-Infinity),
    maxPitch: z.number().default(Infinity),
    flying: z.boolean().optional(),
    gliding: z.boolean().optional(),
});

export class EntityEventPredicate extends EventPredicate {
    private readonly minYaw: n.Argument<number>;
    private readonly maxYaw: n.Argument<number>;
    private readonly minPitch: n.Argument<number>;
    private readonly maxPitch: n.Argument<number>;
    private readonly flying?: n.Argument<boolean>;
    private readonly gliding?: n.Argument<boolean>;

    public constructor(args: unknown) {
        super();

        const parsed = EntityEventPredicateParameters.parse(args);

        this.minYaw = parameter(parsed.minYaw, isNumber);
        this.maxYaw = parameter(parsed.maxYaw, isNumber);
        this.minPitch = parameter(parsed.minPitch, isNumber);
        this.maxPitch = parameter(parsed.maxPitch, isNumber);
        if(parsed.flying != null) this.flying = parameter(parsed.flying);
        if(parsed.gliding != null) this.gliding = parameter(parsed.gliding);
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
            this.minYaw(cursor), this.maxYaw(cursor)
        )) return false;

        if(!this.angleBetween(
            cursor.pitch * 180 / Math.PI,
            this.minPitch(cursor), this.maxPitch(cursor)
        )) return false;

        if(this.flying != null) {
            if(this.flying(cursor) != cursor.entity.flying) return false;
        }
        if(this.gliding != null) {
            if(this.gliding(cursor) != cursor.entity.gliding) return false;
        }

        return true;
    }
}