import { Inventory } from "../../item/inventory";
import type { World } from "../../world/world";
import { BlockEntity, BlockEntityType } from "./blockEntity";

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

export interface SerializedBlockEntity {
    id: string;
    x: number, y: number, z: number;
}

export interface BlockEntityWithInventory {
    inventory: Inventory;
}

export class UnknownBlockEntity extends BlockEntity {
    public data?: SerializedBlockEntity;

    public deserialize(data: SerializedBlockEntity) {
        this.data = data;    
    }
    public serialize(): SerializedBlockEntity {
        return Object.assign(this.data ?? {}, super.serialize());
    }
}