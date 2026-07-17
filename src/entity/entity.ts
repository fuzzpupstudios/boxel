import { Box3, Vector3 } from "three";
import type { Time } from "../time";
import type { World } from "../world/world";
import { blockStateRegistry, tileRegistry } from "../block/blockRegistry";
import { AABB } from "../physics/AABB";

export interface Tickable {
    tick(time: Time): void;
}
export class TileCollider {
    public readonly hitboxes = new Array<Box3>;
}

export abstract class Entity implements Tickable {
    public world: World;
    public readonly velocity = new Vector3;
    public aabb: AABB;
    public onGround = false;
    public lastCollisionX = 0;
    public lastCollisionY = 0;
    public lastCollisionZ = 0;
    public gliding = false;
    public flying = false;
    public stepHeight = 0.5;

    public constructor(world: World) {
        this.world = world;
        const tileColliders = new Map<string, TileCollider>;

        for(const blockStateId of blockStateRegistry.keys()) {
            const blockState = blockStateRegistry.get(blockStateId)!;
            
            tileColliders.set(blockStateId, blockState.collider);
        }

        this.aabb = this.createAABB(world, tileColliders);
    }

    protected abstract createAABB(world: World, tileColliders: Map<string, TileCollider>): AABB;
    
    public setWorld(world: World) {
        this.world = world;
    }

    public tick(time: Time): void {
        if(this.world.getChunk(
            this.aabb.position.x >> 4,
            this.aabb.position.y >> 4,
            this.aabb.position.z >> 4
        ) === null) return;

        let gravityInfluence = 1;
        if(this.gliding) gravityInfluence = 0.2;
        if(this.flying) gravityInfluence = 0;

        this.velocity.x += this.world.gravity.x * time.deltaTime * gravityInfluence;
        this.velocity.y += this.world.gravity.y * time.deltaTime * gravityInfluence;
        this.velocity.z += this.world.gravity.z * time.deltaTime * gravityInfluence;

        const collisionY = this.aabb.moveY(this.velocity.y * time.deltaTime);
        if(collisionY !== 0) this.velocity.y = 0;
        this.onGround = collisionY === -1;
        this.lastCollisionY = collisionY;

        const collisionX = this.aabb.moveX(this.velocity.x * time.deltaTime, this.stepHeight);
        if(collisionX !== 0) this.velocity.x = 0;
        this.lastCollisionX = collisionX;

        const collisionZ = this.aabb.moveZ(this.velocity.z * time.deltaTime, this.stepHeight);
        if(collisionZ !== 0) this.velocity.z = 0;
        this.lastCollisionZ = collisionZ;

        if(this.onGround) this.gliding = this.flying = false;

        let friction = 1;
        if(this.gliding) {
            friction = 0.92
        } else if(this.onGround) {
            friction = 0.546;
        } else {
            friction = 0.91;
        }

        const drag = Math.pow(friction, time.deltaTime * 20);
        if(this.flying) {
            this.velocity.x *= drag;
            this.velocity.y *= Math.pow(0.5, time.deltaTime * 20);
            this.velocity.z *= drag;
        } else if(this.gliding) {
            this.velocity.x *= drag;
            this.velocity.y *= drag;
            this.velocity.z *= drag;
        } else {
            this.velocity.x *= drag;
            this.velocity.z *= drag;
        }
    }
}