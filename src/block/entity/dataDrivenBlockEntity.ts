import type { DataDrivenJson } from "../../data/dataDrivenJson";
import type { EventAction } from "../../events/eventAction";
import { EventCursor } from "../../events/eventSheet";
import { Inventory, InventorySlot, SerializedInventory } from "../../item/inventory";
import type { Time } from "../../time";
import type { World } from "../../world/world";
import type { BlockState } from "../block";
import { BlockEntity, BlockEntityType, type SerializedBlockEntity } from "./blockEntity";

export class DataDrivenBlockEntityType extends BlockEntityType {
    public override readonly tickable: boolean;
    public override readonly id: string;
    public readonly inventory?: Inventory;

    public static parseJson(json: DataDrivenJson.BlockEntityType) {
        let inventory: Inventory | undefined;
        
        if(json.slots != null) {
            inventory = new Inventory;

            for(const jsonSlot of json.slots) {
                const slot = new InventorySlot;
                slot.allowInsert = jsonSlot.insert ?? slot.allowInsert;
                slot.allowExtract = jsonSlot.extract ?? slot.allowExtract;
                inventory.addSlot(slot);
            }
        }

        return new DataDrivenBlockEntityType(
            json.id,
            json.tickable ?? false,
            inventory
        )
    }
    
    public constructor(
        id: string, tickable: boolean, inventory?: Inventory
    ) {
        super();

        this.id = id;
        this.tickable = tickable;
        this.inventory = inventory!;
    }
    
    public create(world: World, x: number, y: number, z: number): DataDrivenBlockEntity {
        return new DataDrivenBlockEntity(this, world, x, y, z);
    }
}

interface SerializedDataDrivenBlockEntity extends SerializedBlockEntity {
    inventory?: SerializedInventory;
}

export class DataDrivenBlockEntity extends BlockEntity {
    public readonly inventory?: Inventory;
    private tickEvents: EventAction[] = [];
    private eventCursor?: EventCursor;

    public constructor(type: DataDrivenBlockEntityType, world: World, x: number, y: number, z: number) {
        super(type, world, x, y, z);

        if(type.inventory != null) {
            this.inventory = type.inventory.clone();
        }

        this.updateBlockState(this.blockState);
    }

    public override serialize(): SerializedDataDrivenBlockEntity {
        const prop = super.serialize() as SerializedDataDrivenBlockEntity;

        if(this.inventory != null) {
            prop.inventory = this.inventory.serialize();
        }

        return prop;
    }

    public override deserialize(data: SerializedDataDrivenBlockEntity) {
        if(data.inventory != null && this.inventory != null) {
            this.inventory.deserialize(data.inventory);
        }
    }

    public updateBlockState(state?: string | BlockState) {
        super.updateBlockState(state);

        this.tickEvents = this.blockState.events.triggers.get("base:block_entity/tick") ?? [];
        this.eventCursor = new EventCursor(this.world, this.x, this.y, this.z);
    }

    public override init(): void {
        if(this.eventCursor == null) throw new Error("Block state init() called before event cursor was set");
        this.blockState.events.runTrigger("base:block_entity/init", this.eventCursor);
    }

    public override tick(time: Time) {
        if(this.eventCursor == null) return;

        for(let i = 0; i < this.tickEvents.length; i++) {
            this.tickEvents[i]!.run(this.eventCursor);
        }
    }

    public override deinit(): void {
        if(this.eventCursor == null) throw new Error("Block state deinit() called before event cursor was set");

        this.blockState.events.runTrigger("base:block_entity/remove", this.eventCursor);
    }
}