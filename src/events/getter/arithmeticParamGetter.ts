import z from "zod";
import type { EventParamGetter } from "../eventParamGetter";
import { isNumber, isPrimitive, parameter, parameterVariable } from "../eventVariable";
import n from "../eventVariableTypes";

export const DualArithmeticParamGetterParams = z.tuple([ n.Number.or(z.string()), n.Number.or(z.string()) ]);

function parseDualGetter(params: unknown): [ n.Parameter<number>, n.Parameter<number> ] {
    const parsed = DualArithmeticParamGetterParams.parse(params);

    return [
        typeof parsed[0] == "string" ? parameterVariable(parsed[0], isNumber) : parameter(parsed[0], isNumber),
        typeof parsed[1] == "string" ? parameterVariable(parsed[1], isNumber) : parameter(parsed[1], isNumber)
    ];
}

export function additionEventParamGetter(params: unknown): EventParamGetter<any> {
    const parsed = z.array(n.Primitive).nonempty().parse(params);

    const values = parsed.map(value => parameter(value, isPrimitive));

    return cursor => {
        let value: any = values[0](cursor);
        for(let i = 1; i < values.length; i++) {
            value += values[i](cursor);
        }
        return value;
    }
}

export function multiplicationEventParamGetter(params: unknown): EventParamGetter<any> {
    const parsed = z.array(n.Number).parse(params);

    const values = parsed.map(value => parameter(value, isNumber));

    return cursor => {
        let value = 1;
        for(let i = 0; i < values.length; i++) {
            value *= values[i](cursor);
        }
        return value;
    }
}

export function subtractionEventParamGetter(params: unknown): EventParamGetter<any> {
    const [ a, b ] = parseDualGetter(params);

    return cursor => a(cursor) - b(cursor);
}

export function divisionEventParamGetter(params: unknown): EventParamGetter<any> {
    const [ a, b ] = parseDualGetter(params);

    return cursor => a(cursor) / b(cursor);
}

export function exponentEventParamGetter(params: unknown): EventParamGetter<any> {
    const [ a, b ] = parseDualGetter(params);

    return cursor => a(cursor) ** b(cursor);
}

export function moduloEventParamGetter(params: unknown): EventParamGetter<any> {
    const [ aParam, bParam ] = parseDualGetter(params);

    return cursor => {
        const a = aParam(cursor);
        const b = bParam(cursor);
        return ((a % b) + b) % b;
    }
}