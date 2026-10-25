import { MathUtils } from "three";
import z from "zod";
import type { EventPredicate } from "../eventPredicate";
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

function normalizeAngle(angle: number): number {
    return MathUtils.euclideanModulo(angle + 180, 360) - 180;
}
function angleBetween(angle: number, min: number, max: number): boolean {
    const a = normalizeAngle(angle);
    const lo = isFinite(min) ? normalizeAngle(min) : min;
    const hi = isFinite(max) ? normalizeAngle(max) : max;
    if (lo <= hi) {
        return a >= lo && a <= hi;
    } else {
        return a >= lo || a <= hi;
    }
}

export function entityEventPredicate(args: unknown): EventPredicate {
    const parsed = EntityEventPredicateParameters.parse(args);

    const minYaw = parameter(parsed.minYaw, isNumber);
    const maxYaw = parameter(parsed.maxYaw, isNumber);
    const minPitch = parameter(parsed.minPitch, isNumber);
    const maxPitch = parameter(parsed.maxPitch, isNumber);
    const flying = parsed.flying != null ? parameter(parsed.flying) : undefined;
    const gliding = parsed.gliding != null ? parameter(parsed.gliding) : undefined;

    return (cursor) => {
        if(cursor.entity == null) return false;

        if(!angleBetween(
            cursor.yaw * 180 / Math.PI,
            minYaw(cursor), maxYaw(cursor)
        )) return false;

        if(!angleBetween(
            cursor.pitch * 180 / Math.PI,
            minPitch(cursor), maxPitch(cursor)
        )) return false;

        if(flying != null) {
            if(flying(cursor) != cursor.entity.flying) return false;
        }
        if(gliding != null) {
            if(gliding(cursor) != cursor.entity.gliding) return false;
        }

        return true;
    }
}