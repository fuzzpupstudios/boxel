import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { EventPredicate } from "../eventPredicate";
import { isString, parameter, parameterInventorySlot, parameterRecursive } from "../eventVariable";
import n from "../eventVariableTypes";

export type ItemEventPredicateParameters = z.infer<typeof ItemEventPredicateParameters>;
export const ItemEventPredicateParameters = z.object({
    slot: n.InventorySlot,
    has_tag: n.String.optional(),
    is: n.String.optional(),
    data: z.record(z.string(), z.any()).optional()
})

export function itemEventPredicate(args: unknown): EventPredicate {
    const parsed = ItemEventPredicateParameters.parse(args);

    const slotParam = parameterInventorySlot(parsed.slot);
    const itemHasTag = parsed.has_tag != null ? parameter(parsed.has_tag, isString) : undefined;
    const itemIs = parsed.is != null ? parameter(parsed.is, isString) : undefined;
    const itemData: n.Parameter<any> | undefined = parsed.data != null ? parameterRecursive(parsed.data) : undefined;

    return (cursor) => {
        const slot = slotParam(cursor);

        if(itemIs) {
            if(slot.stack.item != itemIs(cursor)) return false;
        }

        const item = slot.stack.getItemType() ?? blockStateRegistry.get(slot.stack.item);
        if(item == null) return false;

        if(itemHasTag) {
            if(!item.tags.has(itemHasTag(cursor))) return false;
        }

        if(itemData) {
            if(!slot.stack.dataEquals(itemData(cursor))) return false;
        }

        return true;
    }
}