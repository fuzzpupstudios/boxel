import z from "zod";
import type { EventAction } from "../eventAction";
import { isInteger, isPrimitive, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type SetBlockEntityDataActionParameters = z.infer<typeof SetBlockEntityDataActionParameters>;
export const SetBlockEntityDataActionParameters = z.object({
    xOffset: n.Number.default(0),
    yOffset: n.Number.default(0),
    zOffset: n.Number.default(0),
    data: z.record(z.string(), n.Primitive)
});

export function setBlockEntityDataAction(args: unknown): EventAction {
    const parsed = SetBlockEntityDataActionParameters.parse(args);

    const xOffset = parameter(parsed.xOffset, isInteger);
    const yOffset = parameter(parsed.yOffset, isInteger);
    const zOffset = parameter(parsed.zOffset, isInteger);

    const data = new Map<string, n.Parameter<string | number | boolean>>;
    for(const [ param, value ] of Object.entries(parsed.data)) {
        data.set(param, parameter(value, isPrimitive));
    }

    return (cursor) => {
        const blockEntity = cursor.world.getBlockEntity(
            cursor.x + xOffset(cursor),
            cursor.y + yOffset(cursor),
            cursor.z + zOffset(cursor)
        );

        if(blockEntity == null) return;

        for(const [ param, value ] of data) {
            const calculatedValue = value(cursor);
            blockEntity.customData[param] = calculatedValue;
        }
    }
}