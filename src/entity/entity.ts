import { Box3, Vector3 } from "three";
import z from "zod";
import { blockStateRegistry } from "../block/blockRegistry";
import { AABB } from "../physics/AABB";
import type { Time } from "../time";
import type { Chunk, World } from "../world/world";

export interface Tickable {
    tick(time: Time): void;
}
export class TileCollider {
    public readonly hitboxes = new Array<Box3>;
}

export type SerializedEntity = z.infer<typeof SerializedEntity>;
export const SerializedEntity = z.object({
    type: z.string(),
    position: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0, 0, 0 ]),
    velocity: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0, 0, 0 ]),
    gliding: z.boolean().default(false),
    flying: z.boolean().default(false),
    onGround: z.boolean().default(true),
});

export abstract class Entity<SerializedType extends SerializedEntity = SerializedEntity> implements Tickable {
    public abstract readonly type: string;
    public readonly automaticPersistentSaving: boolean = true;

    public world: World;
    public readonly velocity = new Vector3;
    public aabb: AABB;
    public renderPosition = new Vector3;
    public onGround = false;
    public lastCollisionX = 0;
    public lastCollisionY = 0;
    public lastCollisionZ = 0;
    public gliding = false;
    public flying = false;
    public stepHeight = 0.5;
    public chunk: Chunk | null = null;

    public constructor(world: World) {
        this.world = world;
        const tileColliders = new Map<string, TileCollider>;

        for(const blockStateId of blockStateRegistry.keys()) {
            const blockState = blockStateRegistry.get(blockStateId)!;
            
            tileColliders.set(blockStateId, blockState.collider);
        }

        this.aabb = this.createAABB(world, tileColliders);
    }

    public get position() {
        return this.aabb.position;
    }

    protected abstract createAABB(world: World, tileColliders: Map<string, TileCollider>): AABB;
    
    public setWorld(world: World) {
        this.world = world;
    }

    public updateChunk() {
        const chunkX = this.position.x >> 4;
        const chunkY = this.position.y >> 4;
        const chunkZ = this.position.z >> 4;

        if(this.chunk != null) {
            if(
                this.chunk.x === chunkX &&
                this.chunk.y === chunkY &&
                this.chunk.z === chunkZ
            ) {
                return;
            }
        }

        this.chunk?.entities.delete(this);
        this.chunk = this.world.getChunk(chunkX, chunkY, chunkZ);
        this.chunk?.entities.add(this);
    }

    public destroy(): void {
        this.chunk?.entities.delete(this);
        this.chunk = null;
    }
    public remove() {
        this.world.removeEntity(this);
    }

    public render(time: Time): void {
        
    }

    public tick(time: Time): void {
        let previousX = this.position.x;
        let previousY = this.position.y;
        let previousZ = this.position.z;

        if(this.chunk != null) {
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
        this.updateChunk();
        if(this.chunk == null) {
            this.position.set(previousX, previousY, previousZ);
        }
    }

    public deserialize(data: SerializedType) {
        this.position.fromArray(data.position);
        this.velocity.fromArray(data.velocity);
        this.flying = data.flying;
        this.gliding = data.gliding;
        this.onGround = data.onGround;
    }

    public serialize(): SerializedEntity {
        return {
            type: this.type,
            position: this.position.toArray(),
            velocity: this.velocity.toArray(),
            flying: this.flying,
            gliding: this.gliding,
            onGround: this.onGround
        };
    }
}