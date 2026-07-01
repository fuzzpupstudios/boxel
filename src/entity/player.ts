import { Vector3, Box3, Euler, MathUtils } from "three";
import { Entity, type TileCollider } from "./entity";
import type { Time } from "../time";
import { AABB } from "../physics/AABB";
import type { World } from "../world/world";
import { RaycastResult, VoxelRaycaster } from "../physics/raycaster";
import { blockStateRegistry } from "../block/blockRegistry";

export class Player extends Entity {
    public readonly hitbox = new Box3(
        new Vector3(-0.3, 0, -0.3),
        new Vector3(0.3, 1.9, 0.3),
    );
    public readonly eyeHeight = 1.7;
    public readonly walkSpeed = 2.5;
    public readonly jumpHeight = 1;
    public yaw = 0;
    public pitch = 0;

    public readonly targetedBlock = new RaycastResult;
    public readonly reachDistance = 5;

    protected override createAABB(world: World, tileColliders: TileCollider[]): AABB {
        return new AABB(
            new Box3(
                new Vector3(-0.3, 0, -0.3),
                new Vector3(0.3, 1.9, 0.3)
            ),
            world, tileColliders
        );
    }

    public walk(dx: number, dz: number, time: Time) {
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length > 1) {
            dx /= length;
            dz /= length;
        }

        const friction = this.onGround ? 0.546 : 0.91;
        const moveSpeed = this.onGround
            ? this.walkSpeed * (0.16277136 / (friction * friction * friction))
            : this.walkSpeed * 0.15;
        const factor = moveSpeed * time.deltaTime * 20;

        this.velocity.x += Math.cos(this.yaw) * dx * factor - Math.sin(this.yaw) * dz * factor;
        this.velocity.z += Math.sin(this.yaw) * dx * factor + Math.cos(this.yaw) * dz * factor;
    }
    public rotate(deltaYaw: number, deltaPitch: number) {
        this.yaw += deltaYaw;
        this.pitch += deltaPitch;
        this.pitch = MathUtils.clamp(this.pitch, Math.PI * -0.5, Math.PI * 0.5);
    }
    public jump(): void {
        if (this.onGround) {
            this.velocity.y = 9 * Math.sqrt(this.jumpHeight);
            this.onGround = false;
        }
    }

    public destroy() {
        if(!this.targetedBlock.hit || this.targetedBlock.distance > this.reachDistance) return;

        this.world.setBlockStateKey(
            this.targetedBlock.voxel.x,
            this.targetedBlock.voxel.y,
            this.targetedBlock.voxel.z,
            "base:air[default]"
        );
    }
    public place() {
        if(!this.targetedBlock.hit || this.targetedBlock.distance > this.reachDistance) return;

        const selectedBlock = "base:cobblestone[default]";

        const blockState = blockStateRegistry.get(selectedBlock);
        if(blockState == null) return;

        const targetX = this.targetedBlock.voxel.x + this.targetedBlock.side.x;
        const targetY = this.targetedBlock.voxel.y + this.targetedBlock.side.y;
        const targetZ = this.targetedBlock.voxel.z + this.targetedBlock.side.z;

        if(this.aabb.collidesWithTile(blockState.collider, targetX, targetY, targetZ)) return;
        
        this.world.setBlockStateKey(targetX, targetY, targetZ, selectedBlock);
    }

    public tick(time: Time): void {
        super.tick(time);

        const raycaster = new VoxelRaycaster(this.world, (<any><unknown>this.aabb).tileColliders);

        const origin = this.aabb.position.clone();
        origin.y += this.eyeHeight;
        const direction = new Vector3(0, 0, -1).applyEuler(new Euler(this.pitch, -this.yaw, 0, "YZX"));

        raycaster.cast(origin, direction, this.targetedBlock);
    }
}