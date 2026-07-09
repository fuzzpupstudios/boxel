import { Box3, Euler, MathUtils, Vector3 } from "three";
import { blockStateRegistry, getUnknownBlockState } from "../block/blockRegistry";
import { BoxelGame } from "../boxel";
import { AABB } from "../physics/AABB";
import { RaycastResult, VoxelRaycaster } from "../physics/raycaster";
import { PlayingGameStage } from "../stage/impl/playingGameStage";
import type { Time } from "../time";
import { World } from "../world/world";
import { Entity, type TileCollider } from "./entity";
import { Inventory } from "../item/inventory";

export class Player extends Entity {
    public readonly hitbox = new Box3(
        new Vector3(-0.3, 0, -0.3),
        new Vector3(0.3, 1.9, 0.3),
    );
    public eyeHeight = 1.7;
    public walkSpeed = 2.5;
    public crouchSpeedModifier = 0.3;
    public sprintSpeedModifier = 1.3;
    public jumpHeight = 1;
    public yaw = 0;
    public pitch = 0;

    public readonly targetedBlock = new RaycastResult;
    public readonly reachDistance = 5;
    public crouching: boolean = false;
    public sprinting: boolean = false;
    public selectedSlot: number = 0;
    public readonly inventory = new Inventory;

    public constructor(world: World) {
        super(world);
        this.inventory.setSlotCount(50);
    }

    protected override createAABB(world: World, tileColliders: Map<string, TileCollider>): AABB {
        return new AABB(
            new Box3(
                new Vector3(-0.3, 0, -0.3),
                new Vector3(0.3, 1.9, 0.3)
            ),
            world, tileColliders
        );
    }

    public walk(dx: number, dz: number, time: Time) {
        if(this.gliding) return;

        const length = Math.sqrt(dx * dx + dz * dz);
        if(length > 1) {
            dx /= length;
            dz /= length;
        }

        const friction = this.onGround ? 0.546 : 0.91;
        let walkSpeed = this.walkSpeed;
        if(this.crouching) walkSpeed *= this.crouchSpeedModifier;
        if(this.sprinting) walkSpeed *= this.sprintSpeedModifier;
        const moveSpeed = this.onGround
            ? walkSpeed * (0.16277136 / (friction * friction * friction))
            : walkSpeed * 0.15;
        const factor = moveSpeed * time.deltaTime * 20;

        this.velocity.x += Math.cos(this.yaw) * dx * factor - Math.sin(this.yaw) * dz * factor;
        this.velocity.z += Math.sin(this.yaw) * dx * factor + Math.cos(this.yaw) * dz * factor;

        if(this.lastCollisionX !== 0 || this.lastCollisionZ !== 0 && this.sprinting) {
            this.setSprinting(false);
        }
    }
    public rotate(deltaYaw: number, deltaPitch: number) {
        this.yaw += deltaYaw;
        this.pitch += deltaPitch;
        this.pitch = MathUtils.clamp(this.pitch, Math.PI * -0.5, Math.PI * 0.5);
    }
    public jump(): void {
        if(this.onGround) {
            this.velocity.y = 9 * Math.sqrt(this.jumpHeight);
            this.onGround = false;
        }
    }

    public setCrouching(crouching: boolean) {
        if(this.crouching === crouching) return;

        this.crouching = crouching;
        if(crouching) {
            this.eyeHeight = 1.4;
        } else {
            this.eyeHeight = 1.7;
        }
    }

    public setSprinting(sprinting: boolean) {
        this.sprinting = sprinting;
    }
    public setGliding(gliding: boolean) {
        this.gliding = gliding;
    }

    public destroy() {
        if(!this.targetedBlock.hit || this.targetedBlock.distance > this.reachDistance) return;

        const previousState = this.world.getBlockState(
            this.targetedBlock.voxel.x,
            this.targetedBlock.voxel.y,
            this.targetedBlock.voxel.z,
        );

        this.world.setBlockState(
            this.targetedBlock.voxel.x,
            this.targetedBlock.voxel.y,
            this.targetedBlock.voxel.z,
            "base:air[default]"
        );
        const gameStage = BoxelGame.INSTANCE.getActiveStage<PlayingGameStage>(PlayingGameStage);
        gameStage?.blockBreakParticles.blockDestructionParticles(
            this.targetedBlock.voxel.x,
            this.targetedBlock.voxel.y,
            this.targetedBlock.voxel.z,
            previousState
        );
    }
    public place() {
        if(!this.targetedBlock.hit || this.targetedBlock.distance > this.reachDistance) return;

        const holdingStack = this.inventory.stacks[this.selectedSlot];
        if(holdingStack == null) return;

        const blockState = blockStateRegistry.get(holdingStack.item) || getUnknownBlockState();

        let targetX = this.targetedBlock.voxel.x;
        let targetY = this.targetedBlock.voxel.y;
        let targetZ = this.targetedBlock.voxel.z;

        let previousStateId = this.world.getBlockState(targetX, targetY, targetZ);
        let previousState = blockStateRegistry.get(previousStateId) || getUnknownBlockState();

        if(!previousState.tags.has("replaceable")) {
            targetX += this.targetedBlock.side.x;
            targetY += this.targetedBlock.side.y;
            targetZ += this.targetedBlock.side.z;
        }
        
        previousStateId = this.world.getBlockState(targetX, targetY, targetZ);
        previousState = blockStateRegistry.get(previousStateId) || getUnknownBlockState();

        if(!previousState.tags.has("replaceable")) return;

        if(this.aabb.collidesWithTile(blockState.collider, targetX, targetY, targetZ)) return;
        
        this.world.setBlockState(targetX, targetY, targetZ, holdingStack.item);
    }

    public use() {
        if(!this.targetedBlock.hit || this.targetedBlock.distance > this.reachDistance) return;

        const blockStateId = this.world.getBlockState(
            this.targetedBlock.voxel.x,
            this.targetedBlock.voxel.y,
            this.targetedBlock.voxel.z,
        );

        const blockState = blockStateRegistry.get(blockStateId);

        blockState?.events.runTrigger("base:interact", {
            world: this.world,
            x: this.targetedBlock.voxel.x,
            y: this.targetedBlock.voxel.y,
            z: this.targetedBlock.voxel.z,
        });
    }

    public tick(time: Time): void {
        {
            const dy = -0.501;
            if(this.aabb.collidesAtOffset(0, dy, 0) && this.crouching) {
                if(!this.aabb.collidesAtOffset(
                    this.velocity.x * time.deltaTime, dy, 0
                )) {
                    this.velocity.x = 0;
                }
                if(!this.aabb.collidesAtOffset(
                    0, dy, this.velocity.z * time.deltaTime
                )) {
                    this.velocity.z = 0;
                }
                if(!this.aabb.collidesAtOffset(
                    this.velocity.x * time.deltaTime, dy, this.velocity.z * time.deltaTime
                )) {
                    this.velocity.x = 0;
                    this.velocity.z = 0;
                }
            }
        }
        super.tick(time);

        const direction = new Vector3(0, 0, -1).applyEuler(new Euler(this.pitch, -this.yaw, 0, "YZX"));
        
        if(this.gliding) {
            this.velocity.add(direction.clone().add(new Vector3(0, 0.5, 0)).normalize().multiplyScalar(time.deltaTime * 50));
        }

        const raycaster = new VoxelRaycaster(this.world, (<any><unknown>this.aabb).tileColliders);

        const origin = this.aabb.position.clone();
        origin.y += this.eyeHeight;

        raycaster.cast(origin, direction, this.targetedBlock);
    }
}