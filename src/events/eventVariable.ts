import { InventorySlot } from "../item/inventory";
import { ItemStack } from "../item/itemStack";
import { eventParamGetterRegistry } from "./eventParamGetterRegistry";
import type { EventCursor } from "./eventSheet";
import n from "./eventVariableTypes";

function isVariable(obj: any): obj is n.Parameter {
    if(typeof obj !== "object") return false;
    return "$get" in obj;
}

export function parameter<T>(value: n.Parameter | T, validator?: (value: any) => value is T): n.Argument<T> {
    if(isVariable(value)) {
        // structured like { $get: ... }
        const { $get } = value;

        if(typeof $get == "string") {
            // structured like { $get: "something" }
            const path = $get.split(".");
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
                        for(let i = 0; i < path.length; i++) {
                            value = value[path[i]];
                        }
                        if(!validator(value)) throw new TypeError("Validator failed for value " + value);
                        return value;
                    }
                }
            }
        } else {
            // structured like { $get: { "getter": ... } }
            const [ getterId, getterParams ] = Object.entries($get).pop()!;
            const GetterConstructor = eventParamGetterRegistry.get(getterId);

            if(GetterConstructor == null) throw new ReferenceError("Event parameter getter " + getterId + " not found");

            const getter = new GetterConstructor(getterParams);
            return cursor => getter.get(cursor);
        }
    } else {
        // structured as a constant
        return () => <T>value;
    }
}

export function parameterItemStack(value: n.InventorySlot) {
    if(isVariable(value)) {
        return parameter(value, isInventorySlot);
    } else {
        if(typeof value == "string") {
            return () => new InventorySlot(ItemStack.of(value));
        } else {
            const { item, quantity } = value;
            return () => new InventorySlot(ItemStack.of(item, quantity));
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