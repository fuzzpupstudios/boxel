import { BlockState } from "../block";
import { blockStateRegistry } from "../blockRegistry";
import type { Tickable } from "../../entity/entity";
import { Inventory } from "../../item/inventory";
import type { Time } from "../../time";
import type { World } from "../../world/world";

export abstract class BlockEntityType {
    public abstract readonly tickable: boolean;
    public abstract readonly id: string;

    public abstract create(world: World, x: number, y: number, z: number): BlockEntity;
}

export interface SerializedBlockEntity {
    id: string;
    x: number, y: number, z: number;
}

export interface BlockEntityWithInventory {
    inventory: Inventory;
}

export class BlockEntity implements Tickable {
    protected blockState: BlockState;
    public constructor(
        public readonly type: BlockEntityType,
        public readonly world: World,
        public readonly x: number,
        public readonly y: number,
        public readonly z: number
    ) {
        this.blockState = null!;
        this.updateBlockState();
    }

    public updateBlockState(state?: string | BlockState) {
        if(state == null) state = this.world.getBlockState(this.x, this.y, this.z);
        if(typeof state == "string") {
            const resolvedState = blockStateRegistry.get(state)!;
            if(resolvedState == null) throw new ReferenceError("Block state " + state + " not found");
            state = resolvedState;
        }
        this.blockState = state;
    }

    public hasInventory(): this is BlockEntityWithInventory {
        return (<any>this).inventory instanceof Inventory;
    }

    public init() { }
    public tick(time: Time) { }
    public deinit() { }

    public deserialize(data: SerializedBlockEntity) {

    }
    public serialize(): SerializedBlockEntity {
        return {
            id: this.type.id,
            x: this.x, y: this.y, z: this.z,
        }
    }
}