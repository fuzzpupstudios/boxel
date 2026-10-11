import z from "zod";
import type { EventCursor } from "./eventSheet";

namespace n {
    export type InnerParameter = z.infer<typeof InnerParameter>;
    export const InnerParameter = z.record(z.string(), z.any());

    export type Parameter = z.infer<typeof Parameter>;
    export const Parameter = z.strictObject({
        $get: z.union([ InnerParameter, z.string() ])
    });

    export type Number = z.infer<typeof Number>;
    export const Number = z.union([ z.number(), InnerParameter ]);

    export type Integer = z.infer<typeof Integer>;
    export const Integer = z.union([ z.int(), InnerParameter ]);

    export type String = z.infer<typeof String>;
    export const String = z.union([ z.string(), InnerParameter ]);

    export type Boolean = z.infer<typeof Boolean>;
    export const Boolean = z.union([ z.boolean(), InnerParameter ]);

    export type ItemStack = z.infer<typeof ItemStack>;
    export const ItemStack = z.strictObject({
        item: z.union([ z.string(), Parameter ]).default("base:air[default]"),
        quantity: Integer.default(1)
    })

    export type InventorySlot = z.infer<typeof InventorySlot>;
    export const InventorySlot = z.union([ z.null(), z.string(), ItemStack, Parameter ]);

    export type Primitive = z.infer<typeof Primitive>;
    export const Primitive = z.union([ z.number(), z.string(), z.boolean(), InnerParameter ]);


    export type Argument<T> = (cursor: EventCursor) => T;
}

export default n;