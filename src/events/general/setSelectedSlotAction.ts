import z from "zod";
import { Player } from "../../entity/player";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { isInteger, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type SetSelectedSlotActionParameters = z.infer<typeof SetSelectedSlotActionParameters>;
export const SetSelectedSlotActionParameters = z.object({
    slot: n.Integer
});

export class SetSelectedSlotAction extends EventAction {
    private readonly slot: n.Argument<number>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = SetSelectedSlotActionParameters.parse(args);

        this.slot = parameter(parsed.slot, isInteger);
    }
    public override run(cursor: EventCursor): void {
        if(cursor.entity instanceof Player) {
            cursor.entity.setSelectedSlot(this.slot(cursor));
        }
    }
}