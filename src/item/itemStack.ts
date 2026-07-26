import z from "zod";

export const SerializedItemStack = z.object({
    item: z.string().default("base:air[default]"),
    quantity: z.int().default(0)
});
export interface SerializedItemStack {
    item: string;
    quantity: number;
}

export class ItemStack {
    public static DEFAULT_ITEM = "base:air[default]";

    public static of(item: string, quantity: number = 1) {
        const stack = new ItemStack;
        stack.item = item;
        stack.quantity = quantity;
        
        return stack;
    }
    public static empty() {
        return new ItemStack;
    }

    public item = ItemStack.DEFAULT_ITEM;
    public quantity = 0;

    public serialize() {
        return {
            item: this.item,
            quantity: this.quantity
        }
    }
    public copyFrom(other: ItemStack) {
        this.item = other.item;
        this.quantity = other.quantity;
    }
    public clone() {
        return ItemStack.of(this.item, this.quantity);
    }
    public isEmpty() {
        return this.quantity === 0;
    }
    public clear() {
        this.item = ItemStack.DEFAULT_ITEM;
        this.quantity = 0;
    }
    public deserialize(stack: SerializedItemStack) {
        this.item = stack.item;
        this.quantity = stack.quantity;
    }
    public swap(other: ItemStack) {
        const otherItem = other.item;
        const otherQuantity = other.quantity;

        other.item = this.item;
        other.quantity = this.quantity;

        this.item = otherItem;
        this.quantity = otherQuantity;
    }
    public mergeInto(other: ItemStack, max = Infinity) {
        if(!other.isEmpty() && other.item != this.item) return;

        const toGive = Math.min(1000 - other.quantity, Math.min(max, this.quantity));

        other.item = this.item;
        other.quantity += toGive;
        this.quantity -= toGive;

        if(this.quantity === 0) this.clear();
    }
    public set(item: string, quantity: number) {
        this.item = item;
        this.quantity = quantity;
    }
}