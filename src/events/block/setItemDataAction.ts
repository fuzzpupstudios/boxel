import z from "zod";
import type { InventorySlot } from "../../item/inventory";
import type { EventAction } from "../eventAction";
import { isParameter, isString, parameter, parameterInventorySlot, parameterOuter, parameterRecursive } from "../eventVariable";
import n from "../eventVariableTypes";

export type SetItemDataActionParameters = z.infer<typeof SetItemDataActionParameters>;
export const SetItemDataActionParameters = z.object({
    slot: n.InventorySlot.optional()
}).and(z.union([
    z.object({
        data: z.any()
    }),
    z.object({
        path: n.String,
        value: z.any()
    })
]));

export function setItemDataAction(args: unknown): EventAction {
    const parsed = SetItemDataActionParameters.parse(args);

    let data: n.Parameter<any> | undefined;
    let path: n.Parameter<string[]> | undefined;
    let value: n.Parameter<any> | undefined;

    if("data" in parsed) {
        data = parameterRecursive(parsed.data);
    } else {
        if(typeof parsed.path == "string") {
            path = parameter(parsed.path.split("."));
        } else {
            const p = parameter(parsed.path, isString);
            path = cursor => p(cursor).split(".");
        }

        if(isParameter(parsed.value)) {
            value = parameterOuter(parsed.value);
        } else if(typeof parsed.value == "object" && parsed.value != null) {
            value = parameterRecursive(parsed.value);
        } else {
            value = parameter(parsed.value);
        }
    }

    let slotParam: n.Parameter<InventorySlot | null>;
    if(parsed.slot) {
        slotParam = parameterInventorySlot(parsed.slot);
    } else {
        slotParam = cursor => cursor.slot;
    }

    return (cursor) => {
        const slot = slotParam(cursor);
        if(slot == null) return;

        if(data) {
            slot.stack.setData(data(cursor));
        } else {
            const pathValue = path!(cursor);
            const final = pathValue[pathValue.length - 1];

            let slotData = slot.stack.data ?? {};

            for(let i = 0; i < pathValue.length - 1; i++) {
                slotData = slotData[pathValue[i]] ?? {};
            }

            slotData[final] = value!(cursor);
            if(slot.stack.data == null) slot.stack.data = slotData;
        }
        slot.update();
    }
}