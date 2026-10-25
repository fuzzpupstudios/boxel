import z from "zod";
import { SerializedItemStack } from "../../item/itemStack";
import type { EventAction } from "../eventAction";
import { isString, parameter, parameterInventorySlot } from "../eventVariable";
import n from "../eventVariableTypes";

export type AssignValueActionParameters = z.infer<typeof AssignValueActionParameters>;
export const AssignValueActionParameters = z.object({
    name: n.String
}).and(z.union([
    z.object({
        value: z.union([ z.number(), z.boolean(), z.string(), SerializedItemStack.strict() ])
    }),
    z.object({
        ref: n.InnerParameter
    })
]));

export function assignValueAction(args: unknown): EventAction {
    const parsed = AssignValueActionParameters.parse(args);

    const name = parameter(parsed.name, isString);
    let value: n.Parameter<any>;
    if("value" in parsed) {
        if(typeof parsed.value == "object") {
            value = parameterInventorySlot(parsed.value);
        } else {
            value = parameter(parsed.value);
        }
    } else {
        value = parameter(parsed.ref);
    }

    return (cursor) => {
        cursor.variables.set(name(cursor), value(cursor));
    }
}