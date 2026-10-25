import z from "zod";
import { itemRegistry } from "./itemRegistry";
import type { Item } from "./item";

export class ItemStack {
    public static DEFAULT_ITEM = "base:air[default]";

    public static of(item: string, quantity: number = 1) {
        const stack = new ItemStack;
        stack.setItem(item);
        stack.quantity = quantity;

        const itemType = stack.getItemType();
        if(itemType?.defaultData) {
            stack.setData(itemType.defaultData);
        }
        
        return stack;
    }
    public static empty() {
        return new ItemStack;
    }

    public item = ItemStack.DEFAULT_ITEM;
    private _itemType: Item | null = null;
    public quantity = 0;
    public data: Record<string, any> | null = null;

    public getStackSize() {
        return this.getItemType()?.stackSize ?? 1000;
    }
    public getItemType() {
        if(this._itemType != null) return this._itemType;

        const itemEntry = itemRegistry.get(this.item);
        this._itemType = itemEntry;
        return itemEntry;
    }

    public serialize(): SerializedItemStack {
        return {
            item: this.item,
            quantity: this.quantity,
            data: this.data ?? undefined
        }
    }
    public copyFrom(other: ItemStack) {
        this.item = other.item;
        this._itemType = other._itemType;
        this.quantity = other.quantity;
        this.setData(other.data);
    }
    public clone() {
        const stack = new ItemStack();
        stack.item = this.item;
        stack._itemType = this._itemType;
        stack.quantity = this.quantity;
        stack.setData(this.data);

        return stack;
    }
    public isEmpty() {
        return this.quantity === 0;
    }
    public clear() {
        this.setItem(ItemStack.DEFAULT_ITEM);
        this.data = null;
        this.quantity = 0;
    }
    public deserialize(stack: SerializedItemStack) {
        this.setItem(stack.item);
        this.quantity = stack.quantity;
        this.data = stack.data ?? null;
    }
    public swap(other: ItemStack) {
        const otherItem = other.item;
        const otherQuantity = other.quantity;
        const otherData = other.data;

        other.setItem(this.item);
        other.data = this.data;
        other.quantity = this.quantity;

        this.setItem(otherItem);
        this.data = otherData;
        this.quantity = otherQuantity;
    }
    public similarTo(other: ItemStack) {
        return this.item === other.item && this.dataEquals(other.data);
    }
    public dataEquals(otherData: Record<string, number> | null) {
        const thisData = this.data!;
        if(thisData == null && otherData == null) return true;
        if((thisData == null) != (otherData == null)) return false;

        const myKeys = new Set(Object.keys(thisData));

        for(const key in otherData) {
            myKeys.delete(key);
            if(thisData[key] !== otherData[key]) return false;
        }

        if(myKeys.size > 0) return false;

        return true;
    }
    public setItem(item: string) {
        if(this.item === item) return;

        this.item = item;
        this._itemType = null;
    }
    public setData(data: any) {
        if(data == null) this.data = null;
        this.data = JSON.parse(JSON.stringify(data));
    }
    public mergeInto(other: ItemStack, max = Infinity) {
        if(!other.isEmpty() && !this.similarTo(other)) return 0;

        const toGive = Math.min(other.getStackSize() - other.quantity, Math.min(max, this.quantity));

        other.setItem(this.item);
        other.setData(this.data);
        other.quantity += toGive;
        this.quantity -= toGive;

        if(this.quantity === 0) this.clear();

        return toGive;
    }
    public split(max: number): ItemStack {
        const stack = this.clone();

        const toMove = Math.min(this.quantity, max);
        stack.quantity = toMove;
        this.quantity -= toMove;

        if(this.quantity == 0) this.clear();

        return stack;
    }
    public toString() {
        return "{ItemStack " + this.item + " x" + this.quantity + " " + JSON.stringify(this.data) + " }";
    }
}

export type SerializedItemStack = z.infer<typeof SerializedItemStack>;
export const SerializedItemStack = z.object({
    item: z.string().default(ItemStack.DEFAULT_ITEM),
    quantity: z.union([
        z.int().default(0),
        z.nan().overwrite(() => 1)
    ]),
    data: z.record(z.string(), z.any()).optional()
});