import { Vector3, type Box3 } from "three";
import { getUnknownBlockState } from "../block/blockRegistry";
import type { TileCollider } from "../block/collider";
import type { World } from "../world/world";
import type { PhysicsDataCache } from "./physicsDataCache";

type CollisionResult = -1 | 0 | 1;

export class AABB {
    public readonly position = new Vector3;
    private static readonly STEP_GROUND_EPSILON = 0.05;

    public constructor(
        public readonly hitbox: Box3,
        public readonly world: World,
        private readonly physicsData: PhysicsDataCache,
    ) {}

    public collidesWithTile(tileCollider: TileCollider, x: number, y: number, z: number) {
        const hitboxes = tileCollider.hitboxes;
        if(!hitboxes.length) return false;

        const offsetHitbox = this.hitbox.clone();
        offsetHitbox.translate(new Vector3(
            this.position.x - x,
            this.position.y - y,
            this.position.z - z
        ));
        
        for(const hitbox of hitboxes) {
            if(hitbox.min.x + x >= this.hitbox.max.x + this.position.x) continue;
            if(hitbox.max.x + x <= this.hitbox.min.x + this.position.x) continue;
            if(hitbox.min.y + y >= this.hitbox.max.y + this.position.y) continue;
            if(hitbox.max.y + y <= this.hitbox.min.y + this.position.y) continue;
            if(hitbox.min.z + z >= this.hitbox.max.z + this.position.z) continue;
            if(hitbox.max.z + z <= this.hitbox.min.z + this.position.z) continue;

            return true;
        }
        
        return false;
    }

    public collidesAtOffset(deltaX: number, deltaY: number, deltaZ: number): boolean {
        const hb = this.hitbox;
        const eMinX = this.position.x + deltaX + hb.min.x;
        const eMaxX = this.position.x + deltaX + hb.max.x;
        const eMinY = this.position.y + deltaY + hb.min.y;
        const eMaxY = this.position.y + deltaY + hb.max.y;
        const eMinZ = this.position.z + deltaZ + hb.min.z;
        const eMaxZ = this.position.z + deltaZ + hb.max.z;

        const minTx = Math.floor(eMinX);
        const maxTx = Math.floor(eMaxX);
        const minTy = Math.floor(eMinY);
        const maxTy = Math.floor(eMaxY);
        const minTz = Math.floor(eMinZ);
        const maxTz = Math.floor(eMaxZ);

        for(let tx = minTx; tx <= maxTx; tx++) {
            for(let ty = minTy; ty <= maxTy; ty++) {
                for(let tz = minTz; tz <= maxTz; tz++) {
                    const tile = this.world.tiles.getBlockStateId(tx, ty, tz);

                    const collider = this.physicsData.tileColliders.get(tile) || getUnknownBlockState().collider;
                    if(!collider) continue;

                    const hitboxes = collider.hitboxes;
                    if(!hitboxes.length) continue;

                    for(const box of hitboxes) {
                        const tileMinX = tx + box.min.x;
                        const tileMaxX = tx + box.max.x;
                        const tileMinY = ty + box.min.y;
                        const tileMaxY = ty + box.max.y;
                        const tileMinZ = tz + box.min.z;
                        const tileMaxZ = tz + box.max.z;

                        if(eMaxX <= tileMinX || eMinX >= tileMaxX) continue;
                        if(eMaxY <= tileMinY || eMinY >= tileMaxY) continue;
                        if(eMaxZ <= tileMinZ || eMinZ >= tileMaxZ) continue;

                        return true;
                    }
                }
            }
        }

        return false;
    }

    private getCollider(tx: number, ty: number, tz: number) {
        const tile = this.world.tiles.getBlockStateId(tx, ty, tz);
        return this.physicsData.tileColliders.get(tile) || getUnknownBlockState().collider;
    }

    private canAttemptStep(stepHeight: number) {
        return stepHeight > 0 && this.collidesAtOffset(0, -AABB.STEP_GROUND_EPSILON, 0);
    }

    private tryStep(deltaX: number, deltaZ: number, stepHeight: number, candidateHeights: Set<number>) {
        if(!this.canAttemptStep(stepHeight) || !candidateHeights.size) return false;

        const stepHeights = [...candidateHeights].sort((a, b) => a - b);
        for(const stepY of stepHeights) {
            if(stepY <= 0 || stepY > stepHeight) continue;
            if(this.collidesAtOffset(0, stepY, 0)) continue;
            if(this.collidesAtOffset(deltaX, stepY, deltaZ)) continue;
            if(!this.collidesAtOffset(
                deltaX,
                stepY - AABB.STEP_GROUND_EPSILON,
                deltaZ,
            )) continue;

            this.position.y += stepY;
            this.position.x += deltaX;
            this.position.z += deltaZ;
            return true;
        }

        return false;
    }

    public moveX(deltaX: number, stepHeight: number): CollisionResult {
        if(deltaX === 0) return 0;

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
        const stepCandidates = new Set<number>();

        for(let tx = minTx; tx <= maxTx; tx++) {
            for(let ty = minTy; ty <= maxTy; ty++) {
                for(let tz = minTz; tz <= maxTz; tz++) {
                    const collider = this.getCollider(tx, ty, tz);
                    if(!collider) continue;

                    const hitboxes = collider.hitboxes;
                    if(!hitboxes.length) continue;

                    for(const box of hitboxes) {
                        const tileMinY = ty + box.min.y;
                        const tileMaxY = ty + box.max.y;
                        const tileMinZ = tz + box.min.z;
                        const tileMaxZ = tz + box.max.z;
                        const tileMinX = tx + box.min.x;
                        const tileMaxX = tx + box.max.x;

                        if(eMaxY <= tileMinY || eMinY >= tileMaxY) continue;
                        if(eMaxZ <= tileMinZ || eMinZ >= tileMaxZ) continue;

                        if(deltaX > 0 && eMaxX <= tileMinX) {
                            const d = tileMinX - eMaxX;
                            if(d < collision) {
                                collision = d;
                                stepCandidates.clear();
                            }
                            if(d === collision) {
                                stepCandidates.add(tileMaxY - eMinY);
                            }
                        } else if(deltaX < 0 && eMinX >= tileMaxX) {
                            const d = tileMaxX - eMinX;
                            if(d > collision) {
                                collision = d;
                                stepCandidates.clear();
                            }
                            if(d === collision) {
                                stepCandidates.add(tileMaxY - eMinY);
                            }
                        }
                    }
                }
            }
        }

        if(collision !== deltaX && this.tryStep(deltaX, 0, stepHeight, stepCandidates)) {
            return 0;
        }

        this.position.x += collision;
        return <CollisionResult>-Math.sign(collision - deltaX);
    }

    public moveY(deltaY: number): CollisionResult {
        if(deltaY === 0) return 0;

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

        for(let tx = minTx; tx <= maxTx; tx++) {
            for(let ty = minTy; ty <= maxTy; ty++) {
                for(let tz = minTz; tz <= maxTz; tz++) {
                    const tile = this.world.tiles.getBlockStateId(tx, ty, tz);
                    
                    const collider = this.physicsData.tileColliders.get(tile) || getUnknownBlockState().collider;
                    if(!collider) continue;

                    const hitboxes = collider.hitboxes;
                    if(!hitboxes.length) continue;

                    for(const box of hitboxes) {
                        const tileMinX = tx + box.min.x;
                        const tileMaxX = tx + box.max.x;
                        const tileMinZ = tz + box.min.z;
                        const tileMaxZ = tz + box.max.z;
                        const tileMinY = ty + box.min.y;
                        const tileMaxY = ty + box.max.y;

                        if(eMaxX <= tileMinX || eMinX >= tileMaxX) continue;
                        if(eMaxZ <= tileMinZ || eMinZ >= tileMaxZ) continue;

                        if(deltaY > 0 && eMaxY <= tileMinY) {
                            const d = tileMinY - eMaxY;
                            if(d < collision) collision = d;
                        } else if(deltaY < 0 && eMinY >= tileMaxY) {
                            const d = tileMaxY - eMinY;
                            if(d > collision) collision = d;
                        }
                    }
                }
            }
        }

        this.position.y += collision;
        return <CollisionResult>-Math.sign(collision - deltaY);
    }

    public moveZ(deltaZ: number, stepHeight: number): CollisionResult {
        if(deltaZ === 0) return 0;

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
        const stepCandidates = new Set<number>();

        for(let tx = minTx; tx <= maxTx; tx++) {
            for(let ty = minTy; ty <= maxTy; ty++) {
                for(let tz = minTz; tz <= maxTz; tz++) {
                    const collider = this.getCollider(tx, ty, tz);
                    if(!collider) continue;

                    const hitboxes = collider.hitboxes;
                    if(!hitboxes.length) continue;

                    for(const box of hitboxes) {
                        const tileMinX = tx + box.min.x;
                        const tileMaxX = tx + box.max.x;
                        const tileMinY = ty + box.min.y;
                        const tileMaxY = ty + box.max.y;
                        const tileMinZ = tz + box.min.z;
                        const tileMaxZ = tz + box.max.z;

                        if(eMaxX <= tileMinX || eMinX >= tileMaxX) continue;
                        if(eMaxY <= tileMinY || eMinY >= tileMaxY) continue;

                        if(deltaZ > 0 && eMaxZ <= tileMinZ) {
                            const d = tileMinZ - eMaxZ;
                            if(d < collision) {
                                collision = d;
                                stepCandidates.clear();
                            }
                            if(d === collision) {
                                stepCandidates.add(tileMaxY - eMinY);
                            }
                        } else if(deltaZ < 0 && eMinZ >= tileMaxZ) {
                            const d = tileMaxZ - eMinZ;
                            if(d > collision) {
                                collision = d;
                                stepCandidates.clear();
                            }
                            if(d === collision) {
                                stepCandidates.add(tileMaxY - eMinY);
                            }
                        }
                    }
                }
            }
        }

        if(collision !== deltaZ && this.tryStep(0, deltaZ, stepHeight, stepCandidates)) {
            return 0;
        }

        this.position.z += collision;
        return <CollisionResult>-Math.sign(collision - deltaZ);
    }
}