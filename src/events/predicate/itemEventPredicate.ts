import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { InventorySlot } from "../../item/inventory";
import { Item } from "../../item/item";
import { itemRegistry } from "../../item/itemRegistry";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import { isString, parameter, parameterInventorySlot, parameterRecursive } from "../eventVariable";
import n from "../eventVariableTypes";

export type ItemEventPredicateParameters = z.infer<typeof ItemEventPredicateParameters>;
export const ItemEventPredicateParameters = z.object({
    slot: n.InventorySlot,
    has_tag: n.String.optional(),
    is: n.String.optional(),
    data: z.record(z.string(), z.any()).optional()
})

export class ItemEventPredicate extends EventPredicate {
    private readonly slot: n.Argument<InventorySlot>;
    private readonly itemHasTag?: n.Argument<string>;
    private readonly itemIs?: n.Argument<string>;
    private readonly itemData?: n.Argument<any>;

    public constructor(args: unknown) {
        super();

        const parsed = ItemEventPredicateParameters.parse(args);
        this.slot = parameterInventorySlot(parsed.slot);
        if(parsed.has_tag != null) this.itemHasTag = parameter(parsed.has_tag, isString);
        if(parsed.is != null) this.itemIs = parameter(parsed.is, isString);
        if(parsed.data != null) this.itemData = parameterRecursive(parsed.data);
    }
    public override test(cursor: EventCursor): boolean {
        const slot = this.slot(cursor);

        if(this.itemIs) {
            if(slot.stack.item != this.itemIs(cursor)) return false;
        }

        const item = slot.stack.getItemType() ?? blockStateRegistry.get(slot.stack.item);
        if(item == null) return false;

        if(this.itemHasTag) {
            if(!item.tags.has(this.itemHasTag(cursor))) return false;
        }

        if(this.itemData) {
            if(!slot.stack.dataEquals(this.itemData(cursor))) return false;
        }

        return true;
    }
}