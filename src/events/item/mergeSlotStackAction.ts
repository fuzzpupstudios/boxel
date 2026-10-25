import z from "zod";
import type { EventAction } from "../eventAction";
import type { EventSheet } from "../eventSheet";
import { parameter, parameterInventorySlot } from "../eventVariable";
import n from "../eventVariableTypes";

export type MergeSlotStackActionParameters = z.infer<typeof MergeSlotStackActionParameters>;
export const MergeSlotStackActionParameters = z.object({
    from: n.InventorySlot,
    to: n.InventorySlot,
    limit: n.Integer.default(Infinity)
});

export function mergeSlotStackAction(args: unknown, eventSheet: EventSheet, capture: Record<string, string>): EventAction {
    const parsed = MergeSlotStackActionParameters.parse(args);

    const from = parameterInventorySlot(parsed.from);
    const to = parameterInventorySlot(parsed.to);
    const limit = parameter(parsed.limit);

    return (cursor) => {
        const fromSlot = from(cursor);
        const toSlot = to(cursor);

        const transferred = fromSlot.stack.mergeInto(toSlot.stack, limit(cursor));

        if(transferred !== 0) {
            fromSlot.onExtract();
            toSlot.onInsert();
        }

        if("transferred" in capture) {
            cursor.variables.set(capture.transferred, transferred);
        }
    }
}