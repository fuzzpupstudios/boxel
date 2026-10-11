import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { isString, parameter, parameterInventorySlot } from "../eventVariable";
import n from "../eventVariableTypes";
import { SerializedItemStack } from "../../item/itemStack";

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

export class AssignValueAction extends EventAction {
    private readonly name: n.Argument<string>;
    private readonly value: n.Argument<any>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = AssignValueActionParameters.parse(args);

        this.name = parameter(parsed.name, isString);
        if("value" in parsed) {
            if(typeof parsed.value == "object") {
                this.value = parameterInventorySlot(parsed.value);
            } else {
                this.value = parameter(parsed.value);
            }
        } else {
            this.value = parameter(parsed.ref);
        }
    }
    public override run(cursor: EventCursor): void {
        cursor.variables.set(this.name(cursor), this.value(cursor));
    }
}