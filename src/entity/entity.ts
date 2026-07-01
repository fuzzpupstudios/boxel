import { Box3, Vector3 } from "three";
import type { Time } from "../time";
import type { World } from "../world/world";
import { blockStateRegistry, tileRegistry } from "../block/blockRegistry";
import { AABB } from "../physics/AABB";

export interface Tickable {
    tick(time: Time): void;
}
export interface TileCollider {
    hitboxes: Box3[]
}

export abstract class Entity implements Tickable {
    public world: World;
    public readonly velocity = new Vector3;
    public aabb: AABB;
    protected onGround = false;

    public constructor(world: World) {
        this.world = world;
        const tileColliders = new Array;
        for(const blockStateKey of tileRegistry.values()) {
            const blockState = blockStateRegistry.get(blockStateKey)!;
            
            tileColliders.push(blockState.collider);
        }

        this.aabb = this.createAABB(world, tileColliders);
    }

    protected abstract createAABB(world: World, tileColliders: TileCollider[]): AABB;
    
    public setWorld(world: World) {
        this.world = world;
    }

    public tick(time: Time): void {
        if(this.world.getChunk(
            this.aabb.position.x >> 4,
            this.aabb.position.y >> 4,
            this.aabb.position.z >> 4
        ) === null) return;

        this.velocity.x += this.world.gravity.x * time.deltaTime;
        this.velocity.y += this.world.gravity.y * time.deltaTime;
        this.velocity.z += this.world.gravity.z * time.deltaTime;

        const collisionY = this.aabb.moveY(this.velocity.y * time.deltaTime);
        if(collisionY !== 0) this.velocity.y = 0;
        this.onGround = collisionY === -1;

        const collisionX = this.aabb.moveX(this.velocity.x * time.deltaTime);
        if(collisionX !== 0) this.velocity.x = 0;

        const collisionZ = this.aabb.moveZ(this.velocity.z * time.deltaTime);
        if(collisionZ !== 0) this.velocity.z = 0;

        const friction = this.onGround ? 0.546 : 0.91;
        const drag = Math.pow(friction, time.deltaTime * 20);
        this.velocity.x *= drag;
        this.velocity.z *= drag;
    }
}