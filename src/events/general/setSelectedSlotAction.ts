import z from "zod";
import { Player } from "../../entity/player";
import type { EventAction } from "../eventAction";
import { isInteger, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type SetSelectedSlotActionParameters = z.infer<typeof SetSelectedSlotActionParameters>;
export const SetSelectedSlotActionParameters = z.object({
    slot: n.Integer
});

export function setSelectedSlotAction(args: unknown): EventAction {
    const parsed = SetSelectedSlotActionParameters.parse(args);

    const slot = parameter(parsed.slot, isInteger);

    return (cursor) => {
        if(cursor.entity instanceof Player) {
            cursor.entity.setSelectedSlot(slot(cursor));
        }
    }
}