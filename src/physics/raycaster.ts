import { Vector3, type Vector3Like } from "three";
import type { World } from "../world/world";
import type { TileCollider } from "../entity/entity";

export class Side {
    public static NORTH = new Side(0, 0, 1);
    public static EAST = new Side(1, 0, 0);
    public static SOUTH = new Side(0, 0, -1);
    public static WEST = new Side(-1, 0, 0);
    public static UP = new Side(0, 1, 0);
    public static DOWN = new Side(0, -1, 0);

    public readonly normal: Readonly<Vector3Like>;
    private constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number
    ) {
        this.normal = { x, y, z };
    }
}

export class RaycastResult {
    public hit: boolean = false;
    public readonly position = new Vector3;
    public readonly voxel = new Vector3;
    public collider: TileCollider | null = null;
    public side: Side = Side.UP;
    public distance = Infinity;
}

export class VoxelRaycaster {
    private static readonly MAX_DISTANCE = 256;

    public constructor(
        public readonly world: World,
        private readonly tileColliders: TileCollider[],
    ) {}

    public cast(origin: Vector3, direction: Vector3, out: RaycastResult) {
        out.hit = false;
        out.distance = Infinity;
        out.side = Side.UP;
        out.position.copy(origin);

        if(direction.lengthSq() === 0) {
            return;
        }

        const dir = direction.clone().normalize();
        const invDirX = dir.x !== 0 ? 1 / dir.x : Number.POSITIVE_INFINITY;
        const invDirY = dir.y !== 0 ? 1 / dir.y : Number.POSITIVE_INFINITY;
        const invDirZ = dir.z !== 0 ? 1 / dir.z : Number.POSITIVE_INFINITY;

        let voxelX = Math.floor(origin.x);
        let voxelY = Math.floor(origin.y);
        let voxelZ = Math.floor(origin.z);

        const stepX = dir.x > 0 ? 1 : -1;
        const stepY = dir.y > 0 ? 1 : -1;
        const stepZ = dir.z > 0 ? 1 : -1;

        const nextVoxelBoundaryX = voxelX + (stepX > 0 ? 1 : 0);
        const nextVoxelBoundaryY = voxelY + (stepY > 0 ? 1 : 0);
        const nextVoxelBoundaryZ = voxelZ + (stepZ > 0 ? 1 : 0);

        let tMaxX = dir.x !== 0 ? (nextVoxelBoundaryX - origin.x) * invDirX : Number.POSITIVE_INFINITY;
        let tMaxY = dir.y !== 0 ? (nextVoxelBoundaryY - origin.y) * invDirY : Number.POSITIVE_INFINITY;
        let tMaxZ = dir.z !== 0 ? (nextVoxelBoundaryZ - origin.z) * invDirZ : Number.POSITIVE_INFINITY;

        const tDeltaX = dir.x !== 0 ? Math.abs(invDirX) : Number.POSITIVE_INFINITY;
        const tDeltaY = dir.y !== 0 ? Math.abs(invDirY) : Number.POSITIVE_INFINITY;
        const tDeltaZ = dir.z !== 0 ? Math.abs(invDirZ) : Number.POSITIVE_INFINITY;

        let traveled = 0;

        while (traveled <= VoxelRaycaster.MAX_DISTANCE) {
            const tile = this.world.tiles.getTile(voxelX, voxelY, voxelZ);

            const collider = this.tileColliders[tile]!;
            if(collider.hitboxes.length) {
                const hit = this.intersectTileHitboxes(origin, dir, voxelX, voxelY, voxelZ, collider.hitboxes);
                const rayStepDistance = Math.min(tMaxX, tMaxY, tMaxZ);
                if(hit !== null && hit.distance <= rayStepDistance + 1e-9 && hit.distance <= VoxelRaycaster.MAX_DISTANCE) {
                    out.hit = true;
                    out.distance = hit.distance;
                    out.side = hit.side;
                    out.position.copy(dir).multiplyScalar(hit.distance).add(origin);
                    out.voxel.set(voxelX, voxelY, voxelZ);
                    out.collider = collider;
                    return;
                }
            }

            if(tMaxX < tMaxY) {
                if(tMaxX < tMaxZ) {
                    voxelX += stepX;
                    traveled = tMaxX;
                    tMaxX += tDeltaX;
                } else {
                    voxelZ += stepZ;
                    traveled = tMaxZ;
                    tMaxZ += tDeltaZ;
                }
            } else {
                if(tMaxY < tMaxZ) {
                    voxelY += stepY;
                    traveled = tMaxY;
                    tMaxY += tDeltaY;
                } else {
                    voxelZ += stepZ;
                    traveled = tMaxZ;
                    tMaxZ += tDeltaZ;
                }
            }
        }
    }

    private intersectTileHitboxes(
        origin: Vector3,
        direction: Vector3,
        tileX: number,
        tileY: number,
        tileZ: number,
        hitboxes: TileCollider["hitboxes"],
    ): { distance: number; side: Side } | null {
        let closest: { distance: number; side: Side } | null = null;

        for(const hitbox of hitboxes) {
            const minX = tileX + hitbox.min.x;
            const maxX = tileX + hitbox.max.x;
            const minY = tileY + hitbox.min.y;
            const maxY = tileY + hitbox.max.y;
            const minZ = tileZ + hitbox.min.z;
            const maxZ = tileZ + hitbox.max.z;

            const hit = this.intersectBox(origin, direction, minX, minY, minZ, maxX, maxY, maxZ);
            if(hit !== null && (closest === null || hit.distance < closest.distance)) {
                closest = hit;
            }
        }

        return closest;
    }

    private intersectBox(
        origin: Vector3,
        direction: Vector3,
        minX: number,
        minY: number,
        minZ: number,
        maxX: number,
        maxY: number,
        maxZ: number,
    ): { distance: number; side: Side } | null {
        let tMin = -Infinity;
        let tMax = Infinity;
        let entrySide = Side.UP;

        if(direction.x !== 0) {
            const invX = 1 / direction.x;
            const t1 = (minX - origin.x) * invX;
            const t2 = (maxX - origin.x) * invX;
            const tNear = Math.min(t1, t2);
            const tFar = Math.max(t1, t2);
            const nearSide = direction.x > 0 ? Side.WEST : Side.EAST;

            if(tNear > tMin) {
                tMin = tNear;
                entrySide = nearSide;
            }
            tMax = Math.min(tMax, tFar);
        } else if(origin.x < minX || origin.x > maxX) {
            return null;
        }

        if(direction.y !== 0) {
            const invY = 1 / direction.y;
            const t1 = (minY - origin.y) * invY;
            const t2 = (maxY - origin.y) * invY;
            const tNear = Math.min(t1, t2);
            const tFar = Math.max(t1, t2);
            const nearSide = direction.y > 0 ? Side.DOWN : Side.UP;

            if(tNear > tMin) {
                tMin = tNear;
                entrySide = nearSide;
            }
            tMax = Math.min(tMax, tFar);
        } else if(origin.y < minY || origin.y > maxY) {
            return null;
        }

        if(direction.z !== 0) {
            const invZ = 1 / direction.z;
            const t1 = (minZ - origin.z) * invZ;
            const t2 = (maxZ - origin.z) * invZ;
            const tNear = Math.min(t1, t2);
            const tFar = Math.max(t1, t2);
            const nearSide = direction.z > 0 ? Side.SOUTH : Side.NORTH;

            if(tNear > tMin) {
                tMin = tNear;
                entrySide = nearSide;
            }
            tMax = Math.min(tMax, tFar);
        } else if(origin.z < minZ || origin.z > maxZ) {
            return null;
        }

        if(tMax < Math.max(tMin, 0)) {
            return null;
        }

        return { distance: tMin >= 0 ? tMin : 0, side: entrySide };
    }
}