import { Inventory } from "../../item/inventory";
import type { World } from "../../world/world";
import { BlockEntity, BlockEntityType, type SerializedBlockEntity } from "./blockEntity";

export class UnknownBlockEntityType extends BlockEntityType {
    public override readonly tickable = false;
    
    public constructor(
        public override id: string
    ) {
        super();
    }

    public create(world: World, x: number, y: number, z: number) {
        return new UnknownBlockEntity(this, world, x, y, z);
    }
}

export interface BlockEntityWithInventory {
    inventory: Inventory;
}

export class UnknownBlockEntity extends BlockEntity {
    public originalData?: SerializedBlockEntity;

    public deserialize(originalData: SerializedBlockEntity) {
        this.originalData = originalData;    
    }
    public serialize(): SerializedBlockEntity {
        return this.originalData ?? super.serialize();
    }
}