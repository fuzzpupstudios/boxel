import z from "zod";
import type { EventParamGetter } from "../eventParamGetter";
import { isString, parameter, parameterVariable } from "../eventVariable";
import n from "../eventVariableTypes";

export const PropertyParamGetterParams = z.object({
    value: n.InnerParameter.or(z.string()),
    path: n.String
});

export function propertyEventParamGetter(params: unknown): EventParamGetter<any> {
    let objectParam: n.Parameter<any>;
    let pathParam: n.Parameter<string> | undefined;
    let constantPath: string[] | undefined;

    const parsed = PropertyParamGetterParams.parse(params);

    if(typeof parsed.value == "string") {
        objectParam = parameterVariable(parsed.value);
    } else {
        objectParam = parameter(parsed.value);
    }
    if(typeof parsed.path == "string") {
        constantPath = parsed.path.split(".");
    } else {
        pathParam = parameter(parsed.path, isString);
    }

    const getter = (object: any, path: string[]) => {
        if(object == null) return null;
        
        for(const prop of path) {
            object = object[prop];
            if(object == null) return null;
        }

        return object;
    }

    if(constantPath) {
        return cursor => getter(objectParam(cursor), constantPath);
    } else {
        return cursor => getter(objectParam(cursor), pathParam!(cursor).split("."));
    }
}