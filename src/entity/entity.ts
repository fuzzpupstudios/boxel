import { Box3, Vector3 } from "three";
import type { Time } from "../time";
import type { World } from "../world/world";
import { blockStateRegistry } from "../block/blockRegistry";

export interface Tickable {
    tick(time: Time): void;
}
export interface TileCollider {
    hitboxes: Box3[]
}

export abstract class Entity implements Tickable {
    public world: World;
    public readonly position = new Vector3;
    public readonly velocity = new Vector3;
    public readonly hitbox = new Box3(
        new Vector3(-0.5, -0.5, -0.5),
        new Vector3(0.5, 0.5, 0.5)
    );
    private readonly tileColliders: TileCollider[];
    protected onGround = false;

    public constructor(world: World) {
        this.world = world;
        this.tileColliders = Array.from(blockStateRegistry.values()).map(state => state.collider);
    }
    public setWorld(world: World) {
        this.world = world;
    }

    public tick(time: Time): void {
        this.velocity.x += this.world.gravity.x * time.deltaTime;
        this.velocity.y += this.world.gravity.y * time.deltaTime;
        this.velocity.z += this.world.gravity.z * time.deltaTime;

        this.moveY(this.velocity.y * time.deltaTime);
        this.moveX(this.velocity.x * time.deltaTime);
        this.moveZ(this.velocity.z * time.deltaTime);

        const friction = this.onGround ? 0.546 : 0.91;
        const drag = Math.pow(friction, time.deltaTime * 20);
        this.velocity.x *= drag;
        this.velocity.z *= drag;
    }

    private moveX(deltaX: number): void {
        if (deltaX === 0) return;

        const hb = this.hitbox;
        const eMinX = this.position.x + hb.min.x;
        const eMaxX = this.position.x + hb.max.x;
        const eMinY = this.position.y + hb.min.y;
        const eMaxY = this.position.y + hb.max.y;
        const eMinZ = this.position.z + hb.min.z;
        const eMaxZ = this.position.z + hb.max.z;

        // Swept volume bounds
        const sweptMinX = deltaX > 0 ? eMinX : eMinX + deltaX;
        const sweptMaxX = deltaX > 0 ? eMaxX + deltaX : eMaxX;

        // Tile range to check
        const minTx = Math.floor(sweptMinX);
        const maxTx = Math.floor(sweptMaxX);
        const minTy = Math.floor(eMinY);
        const maxTy = Math.floor(eMaxY);
        const minTz = Math.floor(eMinZ);
        const maxTz = Math.floor(eMaxZ);

        let collision = deltaX;

        for (let tx = minTx; tx <= maxTx; tx++) {
            for (let ty = minTy; ty <= maxTy; ty++) {
                for (let tz = minTz; tz <= maxTz; tz++) {
                    const tile = this.world.tiles.getTile(tx, ty, tz);
                    if (tile === 0) continue;

                    const hitboxes = this.tileColliders[tile]!.hitboxes;
                    if (!hitboxes.length) continue;

                    for (const box of hitboxes) {
                        const tileMinY = ty + box.min.y;
                        const tileMaxY = ty + box.max.y;
                        const tileMinZ = tz + box.min.z;
                        const tileMaxZ = tz + box.max.z;
                        const tileMinX = tx + box.min.x;
                        const tileMaxX = tx + box.max.x;

                        if (eMaxY < tileMinY || eMinY > tileMaxY) continue;
                        if (eMaxZ < tileMinZ || eMinZ > tileMaxZ) continue;

                        if (deltaX > 0 && eMaxX <= tileMinX) {
                            const d = tileMinX - eMaxX;
                            if (d < collision) collision = d;
                        } else if (deltaX < 0 && eMinX >= tileMaxX) {
                            const d = tileMaxX - eMinX;
                            if (d > collision) collision = d;
                        }
                    }
                }
            }
        }

        this.position.x += collision;
        if (collision !== deltaX) {
            this.velocity.x = 0;
        }
    }

    private moveY(deltaY: number): void {
        if (deltaY === 0) return;

        const hb = this.hitbox;
        const eMinX = this.position.x + hb.min.x;
        const eMaxX = this.position.x + hb.max.x;
        const eMinY = this.position.y + hb.min.y;
        const eMaxY = this.position.y + hb.max.y;
        const eMinZ = this.position.z + hb.min.z;
        const eMaxZ = this.position.z + hb.max.z;

        // Swept volume bounds
        const sweptMinY = deltaY > 0 ? eMinY : eMinY + deltaY;
        const sweptMaxY = deltaY > 0 ? eMaxY + deltaY : eMaxY;

        // Tile range to check
        const minTx = Math.floor(eMinX);
        const maxTx = Math.floor(eMaxX);
        const minTy = Math.floor(sweptMinY);
        const maxTy = Math.floor(sweptMaxY);
        const minTz = Math.floor(eMinZ);
        const maxTz = Math.floor(eMaxZ);

        let collision = deltaY;

        for (let tx = minTx; tx <= maxTx; tx++) {
            for (let ty = minTy; ty <= maxTy; ty++) {
                for (let tz = minTz; tz <= maxTz; tz++) {
                    const tile = this.world.tiles.getTile(tx, ty, tz);
                    if (tile === 0) continue;

                    const hitboxes = this.tileColliders[tile]!.hitboxes;
                    if (!hitboxes.length) continue;

                    for (const box of hitboxes) {
                        const tileMinX = tx + box.min.x;
                        const tileMaxX = tx + box.max.x;
                        const tileMinZ = tz + box.min.z;
                        const tileMaxZ = tz + box.max.z;
                        const tileMinY = ty + box.min.y;
                        const tileMaxY = ty + box.max.y;

                        if (eMaxX < tileMinX || eMinX > tileMaxX) continue;
                        if (eMaxZ < tileMinZ || eMinZ > tileMaxZ) continue;

                        if (deltaY > 0 && eMaxY <= tileMinY) {
                            const d = tileMinY - eMaxY;
                            if (d < collision) collision = d;
                        } else if (deltaY < 0 && eMinY >= tileMaxY) {
                            const d = tileMaxY - eMinY;
                            if (d > collision) collision = d;
                        }
                    }
                }
            }
        }

        this.onGround = false;

        this.position.y += collision;
        if (collision !== deltaY) {
            if(deltaY < 0) {
                this.onGround = true;
            }

            this.velocity.y = 0;
        }
    }

    private moveZ(deltaZ: number): void {
        if (deltaZ === 0) return;

        const hb = this.hitbox;
        const eMinX = this.position.x + hb.min.x;
        const eMaxX = this.position.x + hb.max.x;
        const eMinY = this.position.y + hb.min.y;
        const eMaxY = this.position.y + hb.max.y;
        const eMinZ = this.position.z + hb.min.z;
        const eMaxZ = this.position.z + hb.max.z;

        // Swept volume bounds
        const sweptMinZ = deltaZ > 0 ? eMinZ : eMinZ + deltaZ;
        const sweptMaxZ = deltaZ > 0 ? eMaxZ + deltaZ : eMaxZ;

        // Tile range to check
        const minTx = Math.floor(eMinX);
        const maxTx = Math.floor(eMaxX);
        const minTy = Math.floor(eMinY);
        const maxTy = Math.floor(eMaxY);
        const minTz = Math.floor(sweptMinZ);
        const maxTz = Math.floor(sweptMaxZ);

        let collision = deltaZ;

        for (let tx = minTx; tx <= maxTx; tx++) {
            for (let ty = minTy; ty <= maxTy; ty++) {
                for (let tz = minTz; tz <= maxTz; tz++) {
                    const tile = this.world.tiles.getTile(tx, ty, tz);
                    if (tile === 0) continue;

                    const hitboxes = this.tileColliders[tile]!.hitboxes;
                    if (!hitboxes.length) continue;

                    for (const box of hitboxes) {
                        const tileMinX = tx + box.min.x;
                        const tileMaxX = tx + box.max.x;
                        const tileMinY = ty + box.min.y;
                        const tileMaxY = ty + box.max.y;
                        const tileMinZ = tz + box.min.z;
                        const tileMaxZ = tz + box.max.z;

                        if (eMaxX < tileMinX || eMinX > tileMaxX) continue;
                        if (eMaxY < tileMinY || eMinY > tileMaxY) continue;

                        if (deltaZ > 0 && eMaxZ <= tileMinZ) {
                            const d = tileMinZ - eMaxZ;
                            if (d < collision) collision = d;
                        } else if (deltaZ < 0 && eMinZ >= tileMaxZ) {
                            const d = tileMaxZ - eMinZ;
                            if (d > collision) collision = d;
                        }
                    }
                }
            }
        }

        this.position.z += collision;
        if (collision !== deltaZ) {
            this.velocity.z = 0;
        }
    }
}