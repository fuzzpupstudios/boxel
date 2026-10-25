import z from "zod";
import type { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import { parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type FaceEventPredicateParameters = z.infer<typeof FaceEventPredicateParameters>;
export const FaceEventPredicateParameters = z.object({
    sides: z.enum([
        "north", "south",
        "east", "west",
        "up", "down"
    ]).array().default([]),
    minX: n.Number.default(-Infinity),
    maxX: n.Number.default(Infinity),
    minY: n.Number.default(-Infinity),
    maxY: n.Number.default(Infinity)
}).or(z.string());

function trySide(cursor: EventCursor, side: string) {
    if(side === "north" && cursor.faceNormalZ === -1) return true;
    if(side === "south" && cursor.faceNormalZ === 1) return true;
    if(side === "east" && cursor.faceNormalX === 1) return true;
    if(side === "west" && cursor.faceNormalX === -1) return true;
    if(side === "up" && cursor.faceNormalY === 1) return true;
    if(side === "down" && cursor.faceNormalY === -1) return true;

    return false;
}

export function faceEventPredicate(args: unknown): EventPredicate {
    let parsed = FaceEventPredicateParameters.parse(args);

    if(typeof parsed == "string") {
        parsed = FaceEventPredicateParameters.parse({ sides: [ <any>parsed ] });
    }

    if(typeof parsed == "string") throw new Error("unreachable");

    const sides = new Set(parsed.sides);
    const minX = parameter(parsed.minX);
    const maxX = parameter(parsed.maxX);
    const minY = parameter(parsed.minY);
    const maxY = parameter(parsed.maxY);

    return (cursor) => {
        if(sides.size > 0) {
            let matched = false;
            for(const side of sides) {
                matched ||= trySide(cursor, side);
            }
            if(!matched) return false;
        }

        if(cursor.faceHitX < minX(cursor)) return false;
        if(cursor.faceHitX > maxX(cursor)) return false;
        if(cursor.faceHitY < minY(cursor)) return false;
        if(cursor.faceHitY > maxY(cursor)) return false;

        return true;
    }
}