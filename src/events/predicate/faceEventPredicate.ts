import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";

export type FaceEventPredicateParameters = z.infer<typeof FaceEventPredicateParameters>;
export const FaceEventPredicateParameters = z.object({
    sides: z.enum([
        "north", "south",
        "east", "west",
        "up", "down"
    ]).array().default([]),
    minX: z.number().default(-Infinity),
    maxX: z.number().default(Infinity),
    minY: z.number().default(-Infinity),
    maxY: z.number().default(Infinity)
}).or(z.string());

export class FaceEventPredicate extends EventPredicate<FaceEventPredicateParameters> {
    public constructor(args: FaceEventPredicateParameters) {
        super(FaceEventPredicateParameters.parse(args));
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
        if(typeof this.args == "string") {
            return this.trySide(cursor, this.args);
        }

        console.log(cursor, this.args);

        if(this.args.sides.length > 0) {
            let matched = false;
            for(const side of this.args.sides) {
                matched ||= this.trySide(cursor, side);
            }
            if(!matched) return false;
        }

        if(cursor.faceHitX < this.args.minX) return false;
        if(cursor.faceHitX > this.args.maxX) return false;
        if(cursor.faceHitY < this.args.minY) return false;
        if(cursor.faceHitY > this.args.maxY) return false;

        return true;
    }
}