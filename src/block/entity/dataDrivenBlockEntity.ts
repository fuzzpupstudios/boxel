import type { DataDrivenJson } from "../../data/dataDrivenJson";
import type { EventAction } from "../../events/eventAction";
import { EventCursor } from "../../events/eventSheet";
import { Inventory, InventorySlot, SerializedInventory } from "../../item/inventory";
import type { Time } from "../../time";
import type { World } from "../../world/world";
import type { BlockState } from "../blockState";
import { BlockEntity, BlockEntityType, type SerializedBlockEntity } from "./blockEntity";

class BlockEntityInventoryHelper {
    public readonly slots = new Array<InventorySlot>;
    public onUpdate?: (blockEntity: BlockEntity, inventory: Inventory, slot: number) => void;
    public onInsert?: (blockEntity: BlockEntity, inventory: Inventory, slot: number) => void;
    public onExtract?: (blockEntity: BlockEntity, inventory: Inventory, slot: number) => void;

    public addSlot(slot: InventorySlot) {
        this.slots.push(slot);
    }

    public createInventory(blockEntity: BlockEntity) {
        const inventory = new Inventory;

        for(const slot of this.slots) {
            inventory.addSlot(slot.clone());
        }

        inventory.onUpdate.connect(slotId => {
            this.onUpdate?.(blockEntity, inventory, slotId);
        })
        inventory.onInsert.connect(slotId => {
            this.onInsert?.(blockEntity, inventory, slotId);
        })
        inventory.onExtract.connect(slotId => {
            this.onExtract?.(blockEntity, inventory, slotId);
        })

        return inventory;
    }
}

export class DataDrivenBlockEntityType extends BlockEntityType {
    public static parseJson(json: DataDrivenJson.BlockEntityType) {
        let inventoryHelper: BlockEntityInventoryHelper | undefined;
        
        if(json.slots != null) {
            inventoryHelper = new BlockEntityInventoryHelper;

            for(let i = 0; i < json.slots.length; i++) {
                const jsonSlot = json.slots[i];

                const slot = new InventorySlot;
                slot.allowInsert = jsonSlot.insert ?? slot.allowInsert;
                slot.allowExtract = jsonSlot.extract ?? slot.allowExtract;

                inventoryHelper.addSlot(slot);
            }

            const onChangeTriggers = json.slots.map(slot => slot.onChange);
            inventoryHelper.onUpdate = (blockEntity, inventory, slot) => {
                const onChangeTrigger = onChangeTriggers[slot];
                if(onChangeTrigger == null) return;

                const cursor = new EventCursor(blockEntity.world, blockEntity.x, blockEntity.y, blockEntity.z);
                cursor.setSlot(inventory.slots[slot]);

                blockEntity.blockState?.events.runTrigger(onChangeTrigger, cursor);
            }

            const onInsertTriggers = json.slots.map(slot => slot.onInsert);
            inventoryHelper.onInsert = (blockEntity, inventory, slot) => {
                const onChangeTrigger = onInsertTriggers[slot];
                if(onChangeTrigger == null) return;

                const cursor = new EventCursor(blockEntity.world, blockEntity.x, blockEntity.y, blockEntity.z);
                cursor.setSlot(inventory.slots[slot]);

                blockEntity.blockState?.events.runTrigger(onChangeTrigger, cursor);
            }

            const onExtractTriggers = json.slots.map(slot => slot.onExtract);
            inventoryHelper.onExtract = (blockEntity, inventory, slot) => {
                const onChangeTrigger = onExtractTriggers[slot];
                if(onChangeTrigger == null) return;

                const cursor = new EventCursor(blockEntity.world, blockEntity.x, blockEntity.y, blockEntity.z);
                cursor.setSlot(inventory.slots[slot]);

                blockEntity.blockState?.events.runTrigger(onChangeTrigger, cursor);
            }
        }

        const types = new Map(Object.entries(json.data ?? {}));

        return new DataDrivenBlockEntityType(
            json.id,
            json.tickable ?? false,
            types,
            inventoryHelper
        )
    }
    
    private constructor(
        public override readonly id: string,
        public override readonly tickable: boolean,
        public readonly types: Map<string, DataDrivenJson.BlockEntityCustomData>,
        public readonly inventoryHelper?: BlockEntityInventoryHelper,
    ) {
        super();
    }
    
    public create(world: World, x: number, y: number, z: number): DataDrivenBlockEntity {
        return new DataDrivenBlockEntity(this, world, x, y, z);
    }
}

interface SerializedDataDrivenBlockEntity extends SerializedBlockEntity {
    inventory?: SerializedInventory;
}

export class DataDrivenBlockEntity extends BlockEntity<DataDrivenBlockEntityType> {
    public readonly inventory: Inventory | null = null;
    private tickEvents: EventAction[] = [];
    private eventCursor: EventCursor | null = null;

    public constructor(type: DataDrivenBlockEntityType, world: World, x: number, y: number, z: number) {
        super(type, world, x, y, z);

        if(type.inventoryHelper != null) {
            this.inventory = type.inventoryHelper.createInventory(this);
        }
        this.updateEventMemo();
    }

    public override serialize(): SerializedDataDrivenBlockEntity {
        const prop = super.serialize() as SerializedDataDrivenBlockEntity;

        if(this.inventory != null) {
            prop.inventory = this.inventory.serialize();
        }

        return prop;
    }

    public override deserialize(data: SerializedDataDrivenBlockEntity) {
        super.deserialize(data);
        
        if(data.inventory != null && this.inventory != null) {
            this.inventory.deserialize(data.inventory);
        }

        for(const [ name, declaration ] of this.type.types) {
            this.customData[name] ??= declaration.default;
        }
    }

    public updateBlockState(state?: string | BlockState) {
        super.updateBlockState(state);
        this.updateEventMemo();
    }

    private updateEventMemo() {
        if(this.blockState == null) {
            this.tickEvents = [];
            this.eventCursor = null;
        } else {
            this.tickEvents = this.blockState.events.triggers.get("base:block_entity/tick") ?? [];
            this.eventCursor = new EventCursor(this.world, this.x, this.y, this.z);
        }
    }

    public override init(): void {
        if(this.eventCursor == null) throw new Error("Block state init() called before event cursor was set");

        for(const [ name, declaration ] of this.type.types) {
            this.customData[name] = declaration.default;
        }
        this.blockState?.events.runTrigger("base:block_entity/init", this.eventCursor);
    }

    public override tick(time: Time) {
        if(this.eventCursor == null) return;
        
        for(let i = 0; i < this.tickEvents.length; i++) {
            this.tickEvents[i].run(this.eventCursor);
        }
    }

    public override deinit(): void {
        if(this.eventCursor == null) throw new Error("Block state deinit() called before event cursor was set");

        this.blockState?.events.runTrigger("base:block_entity/remove", this.eventCursor);
    }
}