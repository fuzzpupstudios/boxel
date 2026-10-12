import z from "zod";
import type { InventorySlot } from "../../item/inventory";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
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

export class SetItemDataAction extends EventAction {
    private readonly slot: n.Argument<InventorySlot | null>;
    private readonly data?: n.Argument<any>;
    private readonly path?: n.Argument<string[]>;
    private readonly value?: n.Argument<any>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = SetItemDataActionParameters.parse(args);

        if("data" in parsed) {
            this.data = parameterRecursive(parsed.data);
        } else {
            if(typeof parsed.path == "string") {
                this.path = parameter(parsed.path.split("."));
            } else {
                const p = parameter(parsed.path, isString);
                this.path = cursor => p(cursor).split(".");
            }

            if(isParameter(parsed.value)) {
                this.value = parameterOuter(parsed.value);
            } else if(typeof parsed.value == "object" && parsed.value != null) {
                this.value = parameterRecursive(parsed.value);
            } else {
                this.value = parameter(parsed.value);
            }
        }
        
        if(parsed.slot) {
            this.slot = parameterInventorySlot(parsed.slot);
        } else {
            this.slot = cursor => cursor.slot;
        }
    }
    public override run(cursor: EventCursor): void {
        const slot = this.slot(cursor);
        if(slot == null) return;

        if(this.data) {
            slot.stack.setData(this.data(cursor));
        } else {
            const path = this.path!(cursor);
            const final = path[path.length - 1];

            let data = slot.stack.data ?? {};

            for(let i = 0; i < path.length - 1; i++) {
                data = data[path[i]] ?? {};
            }
            
            data[final] = this.value!(cursor);
            if(slot.stack.data == null) slot.stack.data = data;
        }
        slot.update();
    }
}