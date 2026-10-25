import z from "zod";
import type { EventAction } from "../eventAction";
import { isInteger, isPrimitive, parameter } from "../eventVariable";
import n from "../eventVariableTypes";
import { BlockState } from "../../block/blockState";

export type SetBlockStateParameterActionParameters = z.infer<typeof SetBlockStateParameterActionParameters>;
export const SetBlockStateParameterActionParameters = z.object({
    xOffset: n.Integer.default(0),
    yOffset: n.Integer.default(0),
    zOffset: n.Integer.default(0),
    parameters: z.record(z.string(), n.String.or(n.Number))
});

export function setBlockStateParameterAction(args: unknown): EventAction {
    const parsed = SetBlockStateParameterActionParameters.parse(args);

    const xOffsetParam = parameter(parsed.xOffset, isInteger);
    const yOffsetParam = parameter(parsed.yOffset, isInteger);
    const zOffsetParam = parameter(parsed.zOffset, isInteger);

    const blockParameters = new Map<string, n.Parameter<string | number>>;
    for(const [ param, value ] of Object.entries(parsed.parameters)) {
        blockParameters.set(param, parameter(value, v => typeof v === "string" || typeof v === "number"));
    }

    return (cursor) => {
        const xOffset = xOffsetParam(cursor);
        const yOffset = yOffsetParam(cursor);
        const zOffset = zOffsetParam(cursor);

        const blockStateId = cursor.world.getBlockState(
            cursor.x + xOffset,
            cursor.y + yOffset,
            cursor.z + zOffset
        );

        cursor.world.setBlockState(
            cursor.x + xOffset,
            cursor.y + yOffset,
            cursor.z + zOffset,
            BlockState.setStateIdParams(blockStateId, key => blockParameters.get(key)?.(cursor))
        );
    }
}