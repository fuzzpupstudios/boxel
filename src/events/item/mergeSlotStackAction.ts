import z from "zod";
import type { InventorySlot } from "../../item/inventory";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { parameter, parameterItemStack } from "../eventVariable";
import n from "../eventVariableTypes";

export type MergeSlotStackActionParameters = z.infer<typeof MergeSlotStackActionParameters>;
export const MergeSlotStackActionParameters = z.object({
    from: n.InventorySlot,
    to: n.InventorySlot,
    limit: n.Integer.default(Infinity)
});

export class MergeSlotStackAction extends EventAction {
    private readonly from: n.Argument<InventorySlot>;
    private readonly to: n.Argument<InventorySlot>;
    private readonly limit: n.Argument<number>;

    public constructor(
        eventSheet: EventSheet,
        args: unknown, 
        private readonly capture: Record<string, string>
    ) {
        super(eventSheet);
        const parsed = MergeSlotStackActionParameters.parse(args);

        this.from = parameterItemStack(parsed.from);
        this.to = parameterItemStack(parsed.to);
        this.limit = parameter(parsed.limit);
    }
    public override run(cursor: EventCursor): void {
        const fromSlot = this.from(cursor);
        const toSlot = this.to(cursor);

        const transferred = fromSlot.stack.mergeInto(toSlot.stack, this.limit(cursor));

        if(transferred !== 0) {
            fromSlot.onExtract();
            toSlot.onInsert();
        }

        if("transferred" in this.capture) {
            cursor.variables.set(this.capture.transferred, transferred);
        }
    }
}