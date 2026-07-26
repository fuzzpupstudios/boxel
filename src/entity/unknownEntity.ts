import { Box3, Vector3 } from "three";
import { AABB } from "../physics/AABB";
import type { Time } from "../time";
import type { World } from "../world/world";
import { Entity, SerializedEntity, TileCollider } from "./entity";

export class UnknownEntity extends Entity {
    private data?: SerializedEntity;

    public constructor(
        world: World,
        public readonly type: string,
    ) {
        super(world);
    }

    public override render(time: Time): void {
        
    }

    public override tick(time: Time): void {
        
    }

    protected override createAABB(world: World, tileColliders: Map<string, TileCollider>): AABB {
        return new AABB(new Box3(new Vector3, new Vector3), world, tileColliders);
    }

    public override deserialize(data: SerializedEntity): void {
        this.data = data;
    }

    public override serialize(): SerializedEntity {
        return this.data ?? super.serialize();
    }
}