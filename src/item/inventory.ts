import { Signal } from "typed-signals";
import z from "zod";
import { ItemStack, SerializedItemStack } from "./itemStack";

export const SerializedInventory = z.object({
    items: z.array(SerializedItemStack).default([])
})
export interface SerializedInventory {
    items: SerializedItemStack[]
}

export class InventorySlot {
    public allowInsert: boolean = true;
    public allowExtract: boolean = true;
    
    public constructor(
        public readonly stack = ItemStack.empty()
    ) {}

    public serialize(): SerializedItemStack {
        return this.stack.serialize();
    }
    public deserialize(data: SerializedItemStack) {
        this.stack.deserialize(data);
    }
    public clone() {
        const slot = new InventorySlot();
        slot.stack.copyFrom(this.stack);
        slot.allowInsert = this.allowInsert;
        slot.allowExtract = this.allowExtract;

        return slot;
    }
}

export class Inventory {
    public readonly onUpdate = new Signal<(slotId: number) => void>();
    public static deserialize(serialized: SerializedInventory) {
        return new Inventory().deserialize(serialized);
    }

    public slots = new Array<InventorySlot>;

    public addSlot(slot: InventorySlot) {
        this.slots.push(slot);
    }

    public clone(): Inventory {
        const inventory = new Inventory;

        for(const slot of this.slots) {
            inventory.addSlot(slot.clone());
        }

        return inventory;
    }

    public deserialize(serialized: SerializedInventory) {
        for(let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            if(slot == null) {
                console.warn("Cannot deserialize into missing slot " + i)
                continue;
            }
            slot.deserialize(serialized.items[i]!);
        }
    }

    public findItem(item: string) {
        for(let i = 0; i < this.slots.length; i++) {
            if(this.slots[i]!.stack.item == item) return i;
        }

        return -1;
    }

    public addStack(stack: ItemStack) {
        for(let i = 0; i < this.slots.length; i++) {
            const slotStack = this.slots[i]!.stack;
            if(slotStack.item !== stack.item) continue;

            stack.mergeInto(slotStack);
            this.onUpdate.emit(i);

            if(stack.isEmpty()) return;
        }

        for(let i = 0; i < this.slots.length; i++) {
            stack.mergeInto(this.slots[i]!.stack);
            this.onUpdate.emit(i);
            
            if(stack.isEmpty()) return;
        }
    }

    public dump(inventory: Inventory) {
        for(const slot of this.slots) {
            inventory.addStack(slot.stack);
        }
    }

    public serialize(): SerializedInventory {
        return {
            items: this.slots.map(item => item.serialize())
        }
    }
}