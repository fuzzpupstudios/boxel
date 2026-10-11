import { DataDrivenJson } from "../../data/dataDrivenJson";
import { ItemStack, SerializedItemStack } from "../../item/itemStack";
import type { RecursiveRecord } from "../../utilTypes";
import { Pattern, type PatternTypeBase } from "./pattern";

export type PatternEntryParser = (value: any) => any;

export const defaultPatternEntryParsers = {
    number: (value: any) => {
        if(typeof value != "number") throw new TypeError("got " + typeof value);
        return value;
    },
    integer: (value: any) => {
        if(typeof value != "number") throw new TypeError("got " + typeof value);
        if(value != Math.floor(value)) throw new TypeError("got a decimal");
        return value;
    },
    boolean: (value: any) => {
        if(typeof value != "boolean") throw new TypeError("got " + typeof value);
        return value;
    },
    string: (value: any) => {
        if(typeof value != "string") throw new TypeError("got " + typeof value);
        return value;
    },
    item: (value: any) => {
        const parsed = SerializedItemStack.parse(value);

        const stack = new ItemStack();
        stack.deserialize(parsed);
        return stack;
    }
}

export function parseJsonPatternEntry<T extends { [ key: string ]: PatternEntryParser }>(
    patternTypes: T,
    entry: any,
    shape: string | DataDrivenJson.PatternShape,
    parseUndefined: boolean,
    path = new Array<string>
): RecursiveRecord<ReturnType<T[keyof T]>> {
    if(typeof shape == "string") {
        if(!(shape in patternTypes)) throw new ReferenceError(`Unknown shape "${shape}"`);

        const handler = patternTypes[shape];

        
        try {
            return handler(entry);
        } catch(error) {
            throw new Error(`Field "${path.join(".")}" failed to parse (expected ${shape})`, { cause: error });
        }
    } else {
        const parsed: Record<string, any> = {};

        for(const key of Object.keys(shape)) {
            if(key in entry || parseUndefined) {
                parsed[key] = parseJsonPatternEntry(patternTypes, entry[key], shape[key], parseUndefined, path.concat(key));
            }
        }

        return parsed;
    }
}

export class DataDrivenPattern extends Pattern<PatternTypeBase> {
    public static parseJson(
        json: DataDrivenJson.Pattern
    ) {
        const pattern = new DataDrivenPattern();

        for(let i = 0; i < json.entries.length; i++) {
            try {
                const parsed = parseJsonPatternEntry(defaultPatternEntryParsers, json.entries[i], json.shape, true);
                pattern.addEntry(parsed);
            } catch(e) {
                throw new Error("Failed to parse entry " + i, { cause: e });
            }
        }

        return pattern;
    }
}