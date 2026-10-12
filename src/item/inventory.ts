import { Signal } from "typed-signals";
import z from "zod";
import { ItemStack, SerializedItemStack } from "./itemStack";

export const SerializedInventory = z.object({
    items: z.array(SerializedItemStack).default([])
})
export interface SerializedInventory {
    items: SerializedItemStack[]
}

export class Inventory {
    public readonly onUpdate = new Signal<(slotId: number) => void>();
    public readonly onInsert = new Signal<(slotId: number) => void>();
    public readonly onExtract = new Signal<(slotId: number) => void>();

    public static deserialize(serialized: SerializedInventory) {
        return new Inventory().deserialize(serialized);
    }

    public slots = new Array<InventorySlot>;

    public addSlot(slot: InventorySlot) {
        if(slot.inventory != null) throw new ReferenceError("Cannot add a slot to multiple inventories");

        slot.inventory = this;
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
        let changed = 0;
        for(let i = 0; i < this.slots.length && !stack.isEmpty(); i++) {
            const slotStack = this.slots[i].stack;
            if(slotStack.quantity > 0 && !slotStack.similarTo(stack)) continue;

            changed += stack.mergeInto(slotStack);
            this.onUpdate.emit(i);
        }

        return changed;
    }

    public dump(inventory: Inventory) {
        let transferred = 0;
        for(const slot of this.slots) {
            transferred += inventory.addStack(slot.stack);
        }
        return transferred;
    }

    public isEmpty() {
        for(let i = 0; i < this.slots.length; i++) {
            if(!this.slots[i].stack.isEmpty()) return false;
        }
        return true;
    }

    public serialize(): SerializedInventory {
        return {
            items: this.slots.map(item => item.serialize())
        }
    }
}

export class InventorySlot {
    public allowInsert: boolean = true;
    public allowExtract: boolean = true;
    
    public constructor(
        public readonly stack = ItemStack.empty(),
        public inventory?: Inventory
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
    public update() {
        if(this.inventory == null) return;

        const index = this.inventory.slots.indexOf(this);

        if(index == -1) return;

        this.inventory.onUpdate.emit(index);
    }
    public onInsert() {
        if(this.inventory == null) return;

        const index = this.inventory.slots.indexOf(this);

        if(index == -1) return;

        this.inventory.onInsert.emit(index);
        this.inventory.onUpdate.emit(index);
    }
    public onExtract() {
        if(this.inventory == null) return;

        const index = this.inventory.slots.indexOf(this);

        if(index == -1) return;

        this.inventory.onExtract.emit(index);
        this.inventory.onUpdate.emit(index);
    }
    public onSwap() {
        if(this.inventory == null) return;

        const index = this.inventory.slots.indexOf(this);

        if(index == -1) return;

        this.inventory.onInsert.emit(index);
        this.inventory.onExtract.emit(index);
        this.inventory.onUpdate.emit(index);
    }
}