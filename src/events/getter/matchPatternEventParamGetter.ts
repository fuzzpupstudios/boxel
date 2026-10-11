import z from "zod";
import { EventParamGetter } from "../eventParamGetter";
import { EventCursor } from "../eventSheet";
import { isString, parameter, parameterRecursive } from "../eventVariable";
import n from "../eventVariableTypes";
import { patternRegistry } from "../pattern/patternRegistry";

export const MatchPatternEventParamGetterParams = z.object({
    id: n.String,
    query: z.any()
});

export class MatchPatternEventParamGetter extends EventParamGetter<any> {
    private readonly id: n.Argument<string>;
    private readonly query: n.Argument<any>;

    public constructor(params: unknown) {
        super();
        
        const parsed = MatchPatternEventParamGetterParams.parse(params);
        
        this.id = parameter(parsed.id, isString);
        this.query = parameterRecursive(parsed.query);
    }
    public get(cursor: EventCursor): any {
        const patternId = this.id(cursor);
        const pattern = patternRegistry.get(patternId);

        if(pattern == null) throw new ReferenceError("Cannot find pattern with id " + patternId);

        const query = this.query(cursor);
        const found = pattern.find(query);

        return found;
    }
}