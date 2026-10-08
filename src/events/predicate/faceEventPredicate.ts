import z from "zod";
import { EventPredicate } from "../eventPredicate";
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

export class FaceEventPredicate extends EventPredicate {
    private readonly sides: Set<string>;
    private readonly minX: n.Argument<number>;
    private readonly maxX: n.Argument<number>;
    private readonly minY: n.Argument<number>;
    private readonly maxY: n.Argument<number>;

    public constructor(args: unknown) {
        super();

        let parsed = FaceEventPredicateParameters.parse(args);

        if(typeof parsed == "string") {
            parsed = FaceEventPredicateParameters.parse({ sides: [ <any>parsed ] });
        }

        if(typeof parsed == "string") throw new Error("unreachable");

        this.sides = new Set(parsed.sides);
        this.minX = parameter(parsed.minX);
        this.maxX = parameter(parsed.maxX);
        this.minY = parameter(parsed.minY);
        this.maxY = parameter(parsed.maxY);
    }
    private trySide(cursor: EventCursor, side: string) {
        if(side === "north" && cursor.faceNormalZ === -1) return true;
        if(side === "south" && cursor.faceNormalZ === 1) return true;
        if(side === "east" && cursor.faceNormalX === 1) return true;
        if(side === "west" && cursor.faceNormalX === -1) return true;
        if(side === "up" && cursor.faceNormalY === 1) return true;
        if(side === "down" && cursor.faceNormalY === -1) return true;

        return false;
    }
    public override test(cursor: EventCursor): boolean {
        if(this.sides.size > 0) {
            let matched = false;
            for(const side of this.sides) {
                matched ||= this.trySide(cursor, side);
            }
            if(!matched) return false;
        }

        if(cursor.faceHitX < this.minX(cursor)) return false;
        if(cursor.faceHitX > this.maxX(cursor)) return false;
        if(cursor.faceHitY < this.minY(cursor)) return false;
        if(cursor.faceHitY > this.maxY(cursor)) return false;

        return true;
    }
}