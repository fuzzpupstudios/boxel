import z from "zod";
import type { InventorySlot } from "../../item/inventory";
import type { EventParamGetter } from "../eventParamGetter";
import { isString, parameter, parameterInventorySlot } from "../eventVariable";
import n from "../eventVariableTypes";

export const ItemDataParamGetterParams = z.union([
    z.string(),
    z.object({
        slot: n.InventorySlot.optional(),
        prop: n.String
    })
])

export function itemDataParamGetter(params: unknown): EventParamGetter<any> {
    let pathParam: n.Parameter<string[]>;
    let slotParam: n.Parameter<InventorySlot | null>;

    const parsed = ItemDataParamGetterParams.parse(params);

    if(typeof parsed == "string") {
        pathParam = parameter(parsed.split("."));
        slotParam = cursor => cursor.slot;
    } else {
        if(typeof parsed.prop == "string") {
            pathParam = parameter(parsed.prop.split("."));
        } else {
            const p = parameter(parsed.prop, isString);
            pathParam = cursor => p(cursor).split(".");
        }
        if(parsed.slot) {
            slotParam = parameterInventorySlot(parsed.slot);
        } else {
            slotParam = cursor => cursor.slot;
        }
    }

    return cursor => {
        const slot = slotParam(cursor);
        if(slot == null) return null;

        const path = pathParam(cursor);

        let data = slot.stack.data;

        for(let i = 0; i < path.length && data != null; i++) {
            data = data[path[i]];
        }

        return data;
    }
}