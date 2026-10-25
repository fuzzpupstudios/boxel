import z from "zod";
import type { EventParamGetter } from "../eventParamGetter";
import { isString, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export const BlockEntityDataParamGetterParams = z.union([
    z.string(),
    z.object({
        at: z.tuple([ n.Integer, n.Integer, n.Integer ]).default([ 0, 0, 0 ]),
        prop: n.String
    })
])

export function blockEntityDataParamGetter(params: unknown): EventParamGetter<any> {
    let prop: n.Parameter<string>;
    let blockX: n.Parameter<number>;
    let blockY: n.Parameter<number>;
    let blockZ: n.Parameter<number>;

    const parsed = BlockEntityDataParamGetterParams.parse(params);

    if(typeof parsed == "string") {
        prop = parameter(parsed);
        blockX = parameter(0);
        blockY = parameter(0);
        blockZ = parameter(0);
    } else {
        prop = parameter(parsed.prop, isString);
        blockX = parameter(parsed.at[0]);
        blockY = parameter(parsed.at[1]);
        blockZ = parameter(parsed.at[2]);
    }

    return cursor => {
        const blockEntity = cursor.world.getBlockEntity(
            cursor.x + blockX(cursor),
            cursor.y + blockY(cursor),
            cursor.z + blockZ(cursor)
        );
        if(blockEntity == null) return null;

        return blockEntity.customData[prop(cursor)];
    }
}