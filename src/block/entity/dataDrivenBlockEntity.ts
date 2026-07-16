import type { BlockState } from "../block";
import type { DataDrivenJson } from "./data/dataDrivenJson";
import type { EventAction } from "../../events/eventAction";
import { EventCursor } from "../../events/eventSheet";
import { Inventory, InventorySlot, SerializedInventory } from "../../item/inventory";
import type { Assets } from "../../textures/assets";
import type { Time } from "../../time";
import type { World } from "../../world/world";
import { BlockEntity, BlockEntityType, type SerializedBlockEntity } from "./blockEntity";

export class DataDrivenBlockEntityType extends BlockEntityType {
    public override readonly tickable: boolean;
    public override readonly id: string;
    public readonly inventory?: Inventory;
    
    public constructor(
        json: DataDrivenJson.BlockEntity, assets: Assets
    ) {
        super();

        this.id = json.id;
        this.tickable = json.tickable ?? false;

        if(json.slots != null) {
            this.inventory = new Inventory;

            for(const jsonSlot of json.slots) {
                const slot = new InventorySlot;
                slot.allowInsert = jsonSlot.insert ?? slot.allowInsert;
                slot.allowExtract = jsonSlot.extract ?? slot.allowExtract;
                this.inventory.addSlot(slot);
            }
        }
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

        this.tickEvents = this.blockState.events.triggers.get("base:tick") ?? [];
        this.eventCursor = new EventCursor(this.world, this.x, this.y, this.z);
    }

    public override init(): void {
        if(this.inventory != null) {
            for(const slot of this.inventory.slots) {
                if(Math.random() > 0.3) continue;

                slot.stack.item = "base:cobblestone[default]";
                slot.stack.quantity = Math.ceil((Math.random() ** 3) * 1000);
            }
        }
    }

    public override tick(time: Time) {
        if(this.eventCursor == null) return;

        for(let i = 0; i < this.tickEvents.length; i++) {
            this.tickEvents[i]!.run(this.eventCursor);
        }
    }
}