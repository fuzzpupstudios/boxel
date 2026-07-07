import { Signal } from "typed-signals";
import { ItemStack, SerializedItemStack } from "./itemStack";
import z from "zod";

export const SerializedInventory = z.object({
    items: z.array(SerializedItemStack).default([])
})
export interface SerializedInventory {
    items: SerializedItemStack[]
}

export class Inventory {
    public readonly onUpdate = new Signal<(slotId: number) => void>();
    public static deserialize(serialized: SerializedInventory) {
        return new Inventory().deserialize(serialized);
    }

    public stacks = new Array<ItemStack>;
    public slotCount: number = 0;

    public setSlotCount(slotCount: number) {
        this.slotCount = slotCount;

        // Remove extra items
        this.stacks.splice(slotCount);

        // Add nonexistent items
        while(this.stacks.length < slotCount) this.stacks.push(ItemStack.empty());
    }

    public deserialize(serialized: SerializedInventory) {
        this.setSlotCount(serialized.items.length);
        for(let i = 0; i < this.slotCount; i++) {
            this.stacks[i]!.deserialize(serialized.items[i]!);
        }
    }

    public findItem(item: string) {
        for(let i = 0; i < this.stacks.length; i++) {
            if(this.stacks[i]!.item == item) return i;
        }

        return -1;
    }

    public addStack(stack: ItemStack) {
        for(let i = 0; i < this.stacks.length; i++) {
            stack.mergeInto(this.stacks[i]!);
            this.onUpdate.emit(i);
            if(stack.isEmpty()) break;
        }
    }

    public serialize(): SerializedInventory {
        return {
            items: this.stacks.map(item => item.serialize())
        }
    }
}