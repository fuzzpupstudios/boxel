import z from "zod";
import type { EventAction } from "../eventAction";
import { isInteger, isString, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type SetBlockStateIdActionParameters = z.infer<typeof SetBlockStateIdActionParameters>;
export const SetBlockStateIdActionParameters = z.object({
    xOffset: n.Integer.default(0),
    yOffset: n.Integer.default(0),
    zOffset: n.Integer.default(0),
    blockStateId: n.String,
    showParticles: n.Boolean.default(false)
});

export function setBlockStateIdAction(args: unknown): EventAction {
    const parsed = SetBlockStateIdActionParameters.parse(args);

    const xOffset = parameter(parsed.xOffset, isInteger);
    const yOffset = parameter(parsed.yOffset, isInteger);
    const zOffset = parameter(parsed.zOffset, isInteger);
    const blockStateId = parameter(parsed.blockStateId, isString);
    const showParticles = parameter(parsed.showParticles);

    return (cursor) => {
        const x = cursor.x + xOffset(cursor);
        const y = cursor.y + yOffset(cursor);
        const z = cursor.z + zOffset(cursor);

        if(showParticles(cursor)) {
            cursor.clientPlatform?.blockBreakParticles.blockDestructionParticles(x, y, z);
        }
        cursor.world.setBlockState(x, y, z, blockStateId(cursor));
    }
}