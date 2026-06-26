import { Vector3, type Box3 } from "three";
import type { World } from "../world/world";
import type { TileCollider } from "../entity/entity";

type CollisionResult = -1 | 0 | 1;

export class AABB {
    public readonly position = new Vector3;

    public constructor(
        public readonly hitbox: Box3,
        public readonly world: World,
        private readonly tileColliders: TileCollider[],
    ) {}

    public moveX(deltaX: number): CollisionResult {
        if (deltaX === 0) return 0;

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

                        if (eMaxY <= tileMinY || eMinY >= tileMaxY) continue;
                        if (eMaxZ <= tileMinZ || eMinZ >= tileMaxZ) continue;

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
        return <CollisionResult>-Math.sign(collision - deltaX);
    }

    public moveY(deltaY: number): CollisionResult {
        if (deltaY === 0) return 0;

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

                        if (eMaxX <= tileMinX || eMinX >= tileMaxX) continue;
                        if (eMaxZ <= tileMinZ || eMinZ >= tileMaxZ) continue;

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

        this.position.y += collision;
        return <CollisionResult>-Math.sign(collision - deltaY);
    }

    public moveZ(deltaZ: number): CollisionResult {
        if (deltaZ === 0) return 0;

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

                        if (eMaxX <= tileMinX || eMinX >= tileMaxX) continue;
                        if (eMaxY <= tileMinY || eMinY >= tileMaxY) continue;

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
        return <CollisionResult>-Math.sign(collision - deltaZ);
    }
}