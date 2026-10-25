import z from "zod";
import type { EventAction } from "../eventAction";
import { isInteger, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type CloneBlockActionParameters = z.infer<typeof CloneBlockActionParameters>;
export const CloneBlockActionParameters = z.object({
    from: z.tuple([ n.Integer, n.Integer, n.Integer ]).default([0, 0, 0]),
    to: z.tuple([ n.Integer, n.Integer, n.Integer ]).default([0, 0, 0])
});

export function cloneBlockAction(args: unknown): EventAction {
    const parsed = CloneBlockActionParameters.parse(args);

    const fromX = parameter(parsed.from[0], isInteger);
    const fromY = parameter(parsed.from[1], isInteger);
    const fromZ = parameter(parsed.from[2], isInteger);
    const toX = parameter(parsed.to[0], isInteger);
    const toY = parameter(parsed.to[1], isInteger);
    const toZ = parameter(parsed.to[2], isInteger);

    return (cursor) => {
        cursor.world.setBlockState(
            cursor.x + toX(cursor),
            cursor.y + toY(cursor),
            cursor.z + toZ(cursor),
            
            cursor.world.getBlockState(
                cursor.x + fromX(cursor),
                cursor.y + fromY(cursor),
                cursor.z + fromZ(cursor)
            )
        );
    }
}