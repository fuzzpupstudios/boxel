import z from "zod";
import { Player } from "../../entity/player";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

export type SetSelectedSlotActionParameters = z.infer<typeof SetSelectedSlotActionParameters>;
export const SetSelectedSlotActionParameters = z.object({
    slot: z.int()
});

export class SetSelectedSlotAction extends EventAction<SetSelectedSlotActionParameters> {
    public constructor(eventSheet: EventSheet, args: SetSelectedSlotActionParameters) {
        super(eventSheet, SetSelectedSlotActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        if(cursor.entity instanceof Player) {
            cursor.entity.selectedSlot = this.args.slot;
        }
    }
}