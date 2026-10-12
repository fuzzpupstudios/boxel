import z from "zod";
import { InventorySlot } from "../../item/inventory";
import { EventParamGetter } from "../eventParamGetter";
import type { EventCursor } from "../eventSheet";
import { isString, parameter, parameterInventorySlot } from "../eventVariable";
import n from "../eventVariableTypes";
import type { ItemStack } from "../../item/itemStack";

export const ItemDataParamGetterParams = z.union([
    z.string(),
    z.object({
        slot: n.InventorySlot.optional(),
        prop: n.String
    })
])

export class ItemDataParamGetter extends EventParamGetter<any> {
    private readonly path: n.Argument<string[]>;
    private readonly slot: n.Argument<InventorySlot | null>;

    public constructor(params: unknown) {
        super();
        
        const parsed = ItemDataParamGetterParams.parse(params);

        if(typeof parsed == "string") {
            this.path = parameter(parsed.split("."));
            this.slot = cursor => cursor.slot;
        } else {
            if(typeof parsed.prop == "string") {
                this.path = parameter(parsed.prop.split("."));
            } else {
                const p = parameter(parsed.prop, isString);
                this.path = cursor => p(cursor).split(".");
            }
            if(parsed.slot) {
                this.slot = parameterInventorySlot(parsed.slot);
            } else {
                this.slot = cursor => cursor.slot;
            }
        }
    }
    public get(cursor: EventCursor): any {
        const slot = this.slot(cursor);
        if(slot == null) return null;

        const path = this.path(cursor);

        let data = slot.stack.data;

        for(let i = 0; i < path.length && data != null; i++) {
            data = data[path[i]];
        }
        
        return data;
    }
}