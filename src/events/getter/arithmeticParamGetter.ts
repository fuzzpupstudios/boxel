import z from "zod";
import { EventParamGetter } from "../eventParamGetter";
import type { EventCursor } from "../eventSheet";
import { isNumber, isPrimitive, parameter, parameterVariable } from "../eventVariable";
import n from "../eventVariableTypes";

export class AdditionEventParamGetter extends EventParamGetter<any> {
    private readonly values: n.Argument<number | string | boolean>[];

    public constructor(params: unknown) {
        super();
        
        const parsed = z.array(n.Primitive).nonempty().parse(params);

        this.values = parsed.map(value => parameter(value, isPrimitive));
    }
    public get(cursor: EventCursor): any {
        let value: any = this.values[0](cursor);
        for(let i = 1; i < this.values.length; i++) {
            value += this.values[i](cursor);
        }
        return value;
    }
}

export class MultiplicationEventParamGetter extends EventParamGetter<any> {
    private readonly values: n.Argument<number>[];

    public constructor(params: unknown) {
        super();
        
        const parsed = z.array(n.Number).parse(params);

        this.values = parsed.map(value => parameter(value, isNumber));
    }
    public get(cursor: EventCursor): any {
        let value = 1;
        for(let i = 0; i < this.values.length; i++) {
            value *= this.values[i](cursor);
        }
        return value;
    }
}

export class SubtractionEventParamGetter extends EventParamGetter<any> {
    private readonly a: n.Argument<number>;
    private readonly b: n.Argument<number>;

    public constructor(params: unknown) {
        super();
        
        const parsed = z.tuple([ n.Number.or(z.string()), n.Number.or(z.string()) ]).parse(params);

        this.a = typeof parsed[0] == "string" ? parameterVariable(parsed[0], isNumber) : parameter(parsed[0], isNumber);
        this.b = typeof parsed[1] == "string" ? parameterVariable(parsed[1], isNumber) : parameter(parsed[1], isNumber);
    }
    public get(cursor: EventCursor): any {
        return this.a(cursor) - this.b(cursor);
    }
}

export class DivisionEventParamGetter extends EventParamGetter<any> {
    private readonly a: n.Argument<number>;
    private readonly b: n.Argument<number>;

    public constructor(params: unknown) {
        super();
        
        const parsed = z.tuple([ n.Number.or(z.string()), n.Number.or(z.string()) ]).parse(params);

        this.a = typeof parsed[0] == "string" ? parameterVariable(parsed[0], isNumber) : parameter(parsed[0], isNumber);
        this.b = typeof parsed[1] == "string" ? parameterVariable(parsed[1], isNumber) : parameter(parsed[1], isNumber);
    }
    public get(cursor: EventCursor): any {
        return this.a(cursor) / this.b(cursor);
    }
}

export class ExponentEventParamGetter extends EventParamGetter<any> {
    private readonly a: n.Argument<number>;
    private readonly b: n.Argument<number>;

    public constructor(params: unknown) {
        super();
        
        const parsed = z.tuple([ n.Number.or(z.string()), n.Number.or(z.string()) ]).parse(params);

        this.a = typeof parsed[0] == "string" ? parameterVariable(parsed[0], isNumber) : parameter(parsed[0], isNumber);
        this.b = typeof parsed[1] == "string" ? parameterVariable(parsed[1], isNumber) : parameter(parsed[1], isNumber);
    }
    public get(cursor: EventCursor): any {
        return this.a(cursor) ** this.b(cursor);
    }
}

export class ModuloEventParamGetter extends EventParamGetter<any> {
    private readonly a: n.Argument<number>;
    private readonly b: n.Argument<number>;

    public constructor(params: unknown) {
        super();
        
        const parsed = z.tuple([ n.Number.or(z.string()), n.Number.or(z.string()) ]).parse(params);

        this.a = typeof parsed[0] == "string" ? parameterVariable(parsed[0], isNumber) : parameter(parsed[0], isNumber);
        this.b = typeof parsed[1] == "string" ? parameterVariable(parsed[1], isNumber) : parameter(parsed[1], isNumber);
    }
    public get(cursor: EventCursor): any {
        const a = this.a(cursor);
        const b = this.b(cursor);
        return ((a % b) + b) % b;
    }
}