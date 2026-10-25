import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { EventPredicate } from "../eventPredicate";
import { isInteger, isString, parameter } from "../eventVariable";
import n from "../eventVariableTypes";
import { BlockState } from "../../block/blockState";

export type BlockEventPredicateParameters = z.infer<typeof BlockEventPredicateParameters>;
export const BlockEventPredicateParameters = z.object({
    at: z.tuple([
        n.Integer,
        n.Integer,
        n.Integer,
    ]).default([ 0, 0, 0 ]),
    has_tag: n.String.optional(),
    is: n.String.optional(),
    params: z.record(z.string(), n.String).optional()
})

export function blockEventPredicate(args: unknown): EventPredicate {
    const parsed = BlockEventPredicateParameters.parse(args);

    const offsetX = parameter(parsed.at[0], isInteger);
    const offsetY = parameter(parsed.at[1], isInteger);
    const offsetZ = parameter(parsed.at[2], isInteger);
    const blockHasTag = parsed.has_tag != null ? parameter(parsed.has_tag, isString) : undefined;
    const blockIs = parsed.is != null ? parameter(parsed.is, isString) : undefined;
    const stateParams = new Map<string, n.Parameter<string>>;
    if(parsed.params != null) {
        for(const paramName of Object.keys(parsed.params)) {
            stateParams.set(paramName, parameter(parsed.params[paramName], isString));
        }
    }

    return (cursor) => {
        const blockStateId = cursor.world.getBlockState(
            cursor.x + offsetX(cursor),
            cursor.y + offsetY(cursor),
            cursor.z + offsetZ(cursor)
        );

        if(blockIs) {
            if(blockStateId != blockIs(cursor)) return false;
        }

        const blockState = blockStateRegistry.get(blockStateId);

        if(stateParams.size > 0) {
            if(blockState == null) {
                return BlockState.stateIdMatchesArgs(
                    blockStateId,
                    key => stateParams.get(key)?.(cursor)
                );
            } else {
                for(const [ param, value ] of stateParams) {
                    if(blockState.parameters.get(param) != value(cursor)) return false;
                }
            }
        }

        if(blockState && blockHasTag) {
            if(!blockState.tags.has(blockHasTag(cursor))) return false;
        }

        return true;
    }
}