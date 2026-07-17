import { Box3, Euler, MathUtils, Quaternion, Vector2, Vector3 } from "three";
import { blockStateRegistry, getUnknownBlockState } from "../block/blockRegistry";
import { BoxelGame } from "../boxel";
import { AABB } from "../physics/AABB";
import { RaycastResult, VoxelRaycaster } from "../physics/raycaster";
import { PlayingGameStage } from "../stage/impl/playingGameStage";
import type { Time } from "../time";
import { World } from "../world/world";
import { Entity, type TileCollider } from "./entity";
import { Inventory, InventorySlot } from "../item/inventory";
import { EventAction } from "../events/eventAction";
import { EventCursor } from "../events/eventSheet";
import { itemRegistry } from "../item/itemRegistry";

export class Player extends Entity {
    public readonly hitbox = new Box3(
        new Vector3(-0.3, 0, -0.3),
        new Vector3(0.3, 1.9, 0.3),
    );
    public eyeHeight = 1.7;
    public walkSpeed = 2.5;
    public flySpeed = 1.5;
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

        for(let i = 0; i < 50; i++) {
            this.inventory.addSlot(new InventorySlot);
        }
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
        if(this.flying) walkSpeed
        
        let moveSpeed = 0;
        
        if(this.flying) {
            moveSpeed = this.flySpeed;
        } else {
            if(this.onGround) {
                moveSpeed = walkSpeed * (0.16277136 / (friction * friction * friction));
            } else {
                moveSpeed = walkSpeed * 0.15;
            }
        }
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
    public setFlying(flying: boolean) {
        this.flying = flying;
    }

    public destroy(): boolean {
        if(!this.targetedBlock.hit || this.targetedBlock.distance > this.reachDistance) return false;

        let targetX = this.targetedBlock.voxel.x;
        let targetY = this.targetedBlock.voxel.y;
        let targetZ = this.targetedBlock.voxel.z;

        const previousBlockStateId = this.world.getBlockState(targetX, targetY, targetZ);
        const blockState = blockStateRegistry.get(previousBlockStateId);
        const blockEntity = this.world.getBlockEntity(targetX, targetY, targetZ);

        if(blockState != null) {
            const cursor = new EventCursor(this.world, targetX, targetY, targetZ);
            cursor.entity = this;
            blockState.events.runTrigger("base:destroy", cursor);
            
            if(cursor.defaultPrevented) return false;
        }

        if(blockEntity?.hasInventory()) {
            blockEntity.inventory.dump(this.inventory);
        }

        this.world.setBlockState(targetX, targetY, targetZ, "base:air[default]");
        const gameStage = BoxelGame.INSTANCE.getActiveStage<PlayingGameStage>(PlayingGameStage);
        gameStage?.blockBreakParticles.blockDestructionParticles(
            this.targetedBlock.voxel.x,
            this.targetedBlock.voxel.y,
            this.targetedBlock.voxel.z,
            previousBlockStateId
        );

        return true;
    }
    public place(): boolean {
        if(!this.targetedBlock.hit || this.targetedBlock.distance > this.reachDistance) return false;

        const holdingStack = this.inventory.slots[this.selectedSlot]?.stack;
        if(holdingStack == null) return false;

        // do not "place" items
        if(itemRegistry.get(holdingStack.item) != null) return false;

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

        if(this.aabb.collidesWithTile(blockState.collider, targetX, targetY, targetZ)) return false;

        const cursor = new EventCursor(this.world, targetX, targetY, targetZ);
        cursor.entity = this;
        cursor.setFaceDataFromRaycastResult(this.targetedBlock);
        cursor.setRotation(this.yaw, this.pitch);
        
        if(!previousState.tags.has("replaceable")) return false;
        if(!blockState.canPlacePredicate.test(cursor)) return false;
        
        this.world.setBlockState(targetX, targetY, targetZ, holdingStack.item);
        blockState.events.runTrigger("base:place", cursor);

        if(cursor.defaultPrevented) {
            this.world.setBlockState(targetX, targetY, targetZ, previousStateId);
            return false;
        }

        return true;
    }

    public use(): boolean {
        const cursor = new EventCursor(
            this.world,
            this.targetedBlock.voxel.x,
            this.targetedBlock.voxel.y,
            this.targetedBlock.voxel.z,
        );
        cursor.entity = this;
        cursor.setFaceDataFromRaycastResult(this.targetedBlock);
        cursor.setRotation(this.yaw, this.pitch);

        let success = false;

        const holdingStack = this.inventory.slots[this.selectedSlot]?.stack;
        if(holdingStack != null) {
            const item = itemRegistry.get(holdingStack.item);
            const blockState = blockStateRegistry.get(holdingStack.item);

            const events = item?.events ?? blockState?.events;

            if(events != null) {
                events.runTrigger("base:use", cursor);

                if(cursor.defaultPrevented) return false;

                success = true;
            }
        }

        if(this.crouching) {
            success = true;
        } else if(this.targetedBlock.hit && this.targetedBlock.distance <= this.reachDistance) {
            const blockStateId = this.world.getBlockState(
                this.targetedBlock.voxel.x,
                this.targetedBlock.voxel.y,
                this.targetedBlock.voxel.z,
            );

            const blockState = blockStateRegistry.get(blockStateId);
            blockState?.events.runTrigger("base:interact", cursor);

            if(cursor.defaultPrevented) return false;

            success = true;
        }

        return success;
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
        
        if(this.gliding && !this.flying) {
            this.velocity.add(direction.clone().add(new Vector3(0, 0.5, 0)).normalize().multiplyScalar(time.deltaTime * 50));
        }

        const raycaster = new VoxelRaycaster(this.world, (<any><unknown>this.aabb).tileColliders);

        const origin = this.aabb.position.clone();
        origin.y += this.eyeHeight;

        raycaster.cast(origin, direction, this.targetedBlock);
    }
}