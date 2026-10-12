import { InventorySlot } from "../item/inventory";
import { ItemStack } from "../item/itemStack";
import { eventParamGetterRegistry } from "./eventParamGetterRegistry";
import type { EventCursor } from "./eventSheet";
import n from "./eventVariableTypes";

export function isParameter(obj: any): obj is n.Parameter {
    if(obj == null || typeof obj !== "object") return false;
    return "$get" in obj;
}

export function parameterVariable<T>(value: string, validator?: (value: any) => value is T): n.Argument<T> {
    // raw variable
    const path = value.split(".");
    const root = path.shift()!;

    if(path.length == 0) {
        // structured like "variable"
        if(validator == null) {
            return (cursor: EventCursor) => <T>cursor.variables.get(root);
        } else {
            return (cursor: EventCursor) => {
                const value = cursor.variables.get(root);
                if(!validator(value)) throw new TypeError("Validator failed for value " + value);
                return <T>value;
            }
        }
    } else {
        // structured like "variable.prop"
        if(validator == null) {
            return (cursor: EventCursor) => {
                let value: any = cursor.variables.get(root);
                for(let i = 0; i < path.length; i++) {
                    value = value[path[i]];
                }
                return <T>value;
            }
        } else {
            return (cursor: EventCursor) => {
                let value: any = cursor.variables.get(root);
                for(let i = 0; i < path.length && value != null; i++) {
                    value = value[path[i]];
                }
                if(!validator(value)) throw new TypeError("Validator failed for value " + value);
                return value;
            }
        }
    }
}

export function parameter<T>(value: n.InnerParameter | T, validator?: (value: any) => value is T): n.Argument<T> {
    if(typeof value == "object" && value != null && !(value instanceof Array)) {
        // structured like { "getter": ... }
        const [ getterId, getterParams ] = Object.entries(value).pop()!;
        const GetterConstructor = eventParamGetterRegistry.get(getterId);

        if(GetterConstructor == null) throw new ReferenceError("Event parameter getter " + getterId + " not found");

        const getter = new GetterConstructor(getterParams);
        return cursor => getter.get(cursor);
    } else {
        // structured as a constant
        return () => <T>value;
    }
}

export function parameterOuter<T>(value: n.Parameter, validator?: (value: any) => value is T): n.Argument<T> {
    if(typeof value.$get == "string") {
        return parameterVariable(value.$get, validator);
    } else {
        return parameter(value.$get, validator);
    }
}

export function parameterRecursive<T>(value: any): n.Argument<T> {
    if(isParameter(value)) {
        return parameterOuter(value);
    }

    const keys = Object.keys(value);

    const base: any = {};
    const variables = new Map<string, any>;

    for(const key of keys) {
        const innerValue = value[key];

        if(typeof innerValue == "object" && innerValue != null) {
            variables.set(key, parameterRecursive<T>(innerValue));
        } else {
            base[key] = innerValue;
        }
    }
    
    return (cursor: EventCursor) => {
        const constructed: any = Object.assign({}, base);

        for(const [ key, argument ] of variables) {
            constructed[key] = argument(cursor);
        }

        return constructed;
    }
}

export function parameterInventorySlot(value: n.InventorySlot | null): n.Argument<InventorySlot> {
    if(isParameter(value)) {
        return parameterOuter(value, isInventorySlot);
    } else {
        if(value == null) {
            return () => new InventorySlot;
        } if(typeof value == "string") {
            return () => new InventorySlot(ItemStack.of(value));
        } else {
            const item = typeof value.item == "string" ? parameter(value.item) : parameterOuter(value.item, isString);
            const quantity = parameter(value.quantity);

            if(value.data) {
                const data = parameterRecursive(value.data);

                return cursor => {
                    const stack = ItemStack.of(item(cursor), quantity(cursor));
                    stack.setData(data(cursor));

                    return new InventorySlot(stack);
                }
            } else {
                return cursor => new InventorySlot(ItemStack.of(item(cursor), quantity(cursor)));
            }
        }
    }
}

export function isNumber(value: any): value is number {
    return typeof value == "number";
}
export function isInteger(value: any): value is number {
    return typeof value == "number" && value === Math.floor(value);
}
export function isString(value: any): value is string {
    return typeof value == "string";
}
export function isPrimitive(value: any): value is string | number | boolean {
    return typeof value == "string" || typeof value == "number" || typeof value == "boolean";
}
export function isInventorySlot(value: any): value is InventorySlot {
    return value instanceof InventorySlot;
}