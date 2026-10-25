import z from "zod";
import type { EventParamGetter } from "../eventParamGetter";
import { isString, parameter, parameterRecursive } from "../eventVariable";
import n from "../eventVariableTypes";
import { patternRegistry } from "../pattern/patternRegistry";

export const MatchPatternEventParamGetterParams = z.object({
    id: n.String,
    query: z.any()
});

export function matchPatternEventParamGetter(params: unknown): EventParamGetter<any> {
    const parsed = MatchPatternEventParamGetterParams.parse(params);

    const idParam = parameter(parsed.id, isString);
    const queryParam: n.Parameter<any> = parameterRecursive(parsed.query);

    return cursor => {
        const patternId = idParam(cursor);
        const pattern = patternRegistry.get(patternId);

        if(pattern == null) throw new ReferenceError("Cannot find pattern with id " + patternId);

        const query = queryParam(cursor);
        const found = pattern.find(query);

        return found;
    }
}