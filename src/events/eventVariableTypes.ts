import z from "zod";
import { SerializedItemStack } from "../item/itemStack";
import type { EventCursor } from "./eventSheet";

namespace n {
    export type Parameter = z.infer<typeof Parameter>;
    export const Parameter = z.object({
        $get: z.union([
            z.string(),
            z.record(z.string(), z.any())
        ])
    });

    export type Number = z.infer<typeof Number>;
    export const Number = z.union([ z.number(), Parameter ]);

    export type Integer = z.infer<typeof Integer>;
    export const Integer = z.union([ z.int(), Parameter ]);

    export type String = z.infer<typeof String>;
    export const String = z.union([ z.string(), Parameter ]);

    export type Boolean = z.infer<typeof Boolean>;
    export const Boolean = z.union([ z.boolean(), Parameter ]);

    export type InventorySlot = z.infer<typeof InventorySlot>;
    export const InventorySlot = z.union([ z.string(), SerializedItemStack.strict(), Parameter ]);


    export type Argument<T> = (cursor: EventCursor) => T;
}

export default n;