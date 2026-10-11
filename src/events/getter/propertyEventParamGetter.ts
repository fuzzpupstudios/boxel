import z from "zod";
import { EventParamGetter } from "../eventParamGetter";
import type { EventCursor } from "../eventSheet";
import { isString, parameter, parameterVariable } from "../eventVariable";
import n from "../eventVariableTypes";

export const PropertyParamGetterParams = z.object({
    value: n.InnerParameter.or(z.string()),
    path: n.String
});

export class PropertyEventParamGetter extends EventParamGetter<any> {
    private readonly object: n.Argument<any>;
    private readonly path?: n.Argument<string>;
    private readonly constantPath?: string[];

    public constructor(params: unknown) {
        super();
        
        const parsed = PropertyParamGetterParams.parse(params);

        if(typeof parsed.value == "string") {
            this.object = parameterVariable(parsed.value);
        } else {
            this.object = parameter(parsed.value);
        }
        if(typeof parsed.path == "string") {
            this.constantPath = parsed.path.split(".");
        } else {
            this.path = parameter(parsed.path, isString);
        }
    }
    public get(cursor: EventCursor): any {
        let object = this.object(cursor);
        if(object == null) return null;

        const path = this.constantPath ?? this.path!(cursor).split(".");
        
        for(const prop of path) {
            object = object[prop];
            if(object == null) return null;
        }

        return object;
    }
}