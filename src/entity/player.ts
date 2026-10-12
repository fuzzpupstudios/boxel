import { Box3, Euler, MathUtils, Vector3 } from "three";
import z from "zod";
import { blockStateRegistry, getUnknownBlockState } from "../block/blockRegistry";
import type { BlockState } from "../block/blockState";
import { BoxelGame } from "../boxel";
import { EventCursor } from "../events/eventSheet";
import { Inventory, InventorySlot, SerializedInventory } from "../item/inventory";
import { Item } from "../item/item";
import { itemRegistry } from "../item/itemRegistry";
import { ItemStack } from "../item/itemStack";
import { AABB } from "../physics/AABB";
import type { PhysicsDataCache } from "../physics/physicsDataCache";
import { RaycastResult, VoxelRaycaster } from "../physics/raycaster";
import { PlayingGameStage } from "../stage/playing/playingGameStage";
import type { Time } from "../time";
import { World } from "../world/world";
import { AttributeBase, AttributeMap } from "./attribute";
import { baseEntityAttributes, Entity, SerializedEntity } from "./entity";
import { ItemEntity } from "./item";

export type SerializedPlayerEntity = z.infer<typeof SerializedPlayerEntity>;
export const SerializedPlayerEntity = SerializedEntity.extend({
    id: z.string(),
    inventory: SerializedInventory.optional(),
    pointerInventory: SerializedInventory.optional(),
    selectedSlot: z.int().default(0),
    pitch: z.number().default(0),
    yaw: z.number().default(0),
});

const basePlayerAttributes = baseEntityAttributes.extend([
    new AttributeBase("base:walk_speed", 2.5),
    new AttributeBase("base:fly_speed", 1.5),
    new AttributeBase("base:crouch_speed_modifier", 0.3),
    new AttributeBase("base:sprint_speed_modifier", 1.3),
    new AttributeBase("base:jump_height", 1),
    new AttributeBase("base:reach_distance", 5),
    new AttributeBase("base:mining_speed", 1),
])

export class Player extends Entity<SerializedPlayerEntity> {
    public readonly type = "base:player";
    public readonly automaticPersistentSaving = false;

    public readonly hitbox = new Box3(
        new Vector3(-0.3, 0, -0.3),
        new Vector3(0.3, 1.9, 0.3),
    );

    public eyeHeight = 1.7;
    
    public yaw = 0;
    public pitch = 0;
    public id: string = crypto.randomUUID();
    
    public infiniteItems = false;
    public instabreak = false;
    public canFly = false;

    public readonly targetedBlock = new RaycastResult;
    public crouching: boolean = false;
    public sprinting: boolean = false;
    public selectedSlot: number = 0;
    private selectedSlotData: { stack: ItemStack, entry?: Item | BlockState } | null = null;
    public readonly inventory = new Inventory;
    public readonly pointerInventory = new Inventory;

    public constructor(world: World) {
        super(world);

        for(let i = 0; i < 50; i++) {
            this.inventory.addSlot(new InventorySlot);
        }
        this.pointerInventory.addSlot(new InventorySlot);
    }

    protected override createAttributeMap(): AttributeMap {
        return basePlayerAttributes.create();
    }

    protected override createAABB(world: World, physicsData: PhysicsDataCache): AABB {
        return new AABB(
            new Box3(
                new Vector3(-0.3, 0, -0.3),
                new Vector3(0.3, 1.9, 0.3)
            ),
            world, physicsData
        );
    }

    public walk(dx: number, dz: number, time: Time) {
        if(this.gliding) return;

        const length = Math.sqrt(dx * dx + dz * dz);
        if(length > 1) {
            dx /= length;
            dz /= length;
        }
        const crouchSpeedModifier = this.attributes.getOrThrow("base:crouch_speed_modifier", null);
        const sprintSpeedModifier = this.attributes.getOrThrow("base:sprint_speed_modifier", null);
        const flySpeed = this.attributes.getOrThrow("base:fly_speed", null);

        let walkSpeed = this.attributes.getOrThrow("base:walk_speed", null);

        const friction = this.onGround ? 0.546 : 0.91;
        if(this.crouching) walkSpeed *= crouchSpeedModifier;
        if(this.sprinting) walkSpeed *= sprintSpeedModifier;
        if(this.flying) walkSpeed
        
        let moveSpeed = 0;
        
        if(this.flying) {
            moveSpeed = flySpeed;
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
            this.velocity.y = 9 * Math.sqrt(this.attributes.getOrThrow("base:jump_height", null));
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
        this.flying = flying && this.canFly;
    }

    public punch(): boolean {
        const reach = this.attributes.getOrThrow("base:reach_distance", null);
        if(!this.targetedBlock.hit || this.targetedBlock.distance > reach) return false;

        const cursor = new EventCursor(
            this.world,
            this.targetedBlock.voxel.x,
            this.targetedBlock.voxel.y,
            this.targetedBlock.voxel.z,
        );
        cursor.entity = this;
        cursor.setFaceDataFromRaycastResult(this.targetedBlock);
        cursor.setRotation(this.yaw, this.pitch);

        this.selectedSlotData?.entry?.events.runTrigger("base:item/punch_block", cursor);
        if(cursor.defaultPrevented) return false;

        let targetX = this.targetedBlock.voxel.x;
        let targetY = this.targetedBlock.voxel.y;
        let targetZ = this.targetedBlock.voxel.z;

        for(let i = 0; i < 4; i++) {
            this.world.renderer?.blockBreakParticles.blockParticle(
                this.targetedBlock.position.x + (Math.random() - 0.5) * (1 - Math.abs(this.targetedBlock.side.x)) * 0.5,
                this.targetedBlock.position.y + (Math.random() - 0.5) * (1 - Math.abs(this.targetedBlock.side.y)) * 0.5,
                this.targetedBlock.position.z + (Math.random() - 0.5) * (1 - Math.abs(this.targetedBlock.side.z)) * 0.5,
                this.targetedBlock.side.x * 2 + Math.random() * 4 - 2,
                this.targetedBlock.side.y * 2 + Math.random() * 4 - 2,
                this.targetedBlock.side.z * 2 + Math.random() * 4 - 2,
                this.targetedBlock.side,
                this.world.renderer.chunkMesher.tileMeshes.get(
                    this.world.getBlockState(
                        this.targetedBlock.voxel.x,
                        this.targetedBlock.voxel.y,
                        this.targetedBlock.voxel.z,
                    )
                )
            )
        }

        const previousBlockStateId = this.world.getBlockState(targetX, targetY, targetZ);
        const blockState = blockStateRegistry.get(previousBlockStateId);
        blockState?.events.runTrigger("base:hit", cursor);

        return true;
    }

    public breakBlock(): boolean {
        const reach = this.attributes.getOrThrow("base:reach_distance", null);
        if(!this.targetedBlock.hit || this.targetedBlock.distance > reach) return false;

        let targetX = this.targetedBlock.voxel.x;
        let targetY = this.targetedBlock.voxel.y;
        let targetZ = this.targetedBlock.voxel.z;

        const cursor = new EventCursor(this.world, targetX, targetY, targetZ);
        cursor.entity = this;
        cursor.setFaceDataFromRaycastResult(this.targetedBlock);
        cursor.setRotation(this.yaw, this.pitch);

        this.selectedSlotData?.entry?.events.runTrigger("base:item/break_block", cursor);
        if(cursor.defaultPrevented) return false;

        const previousBlockStateId = this.world.getBlockState(targetX, targetY, targetZ);
        const blockState = blockStateRegistry.get(previousBlockStateId);
        const blockEntity = this.world.getBlockEntity(targetX, targetY, targetZ);

        if(blockState != null) {
            blockState.events.runTrigger("base:destroy", cursor);
            
            if(cursor.defaultPrevented) return false;
        }

        if(blockEntity?.hasInventory()) {
            ItemEntity.spewInventory(
                blockEntity.inventory,
                this.world,
                targetX + 0.5, targetY + 0.5, targetZ + 0.5
            );
        }

        this.world.setBlockState(targetX, targetY, targetZ, "base:air[default]");
        const gameStage = BoxelGame.INSTANCE.getActiveStage<PlayingGameStage>(PlayingGameStage);
        gameStage?.worldRenderer.blockBreakParticles.blockDestructionParticles(
            this.targetedBlock.voxel.x,
            this.targetedBlock.voxel.y,
            this.targetedBlock.voxel.z,
            previousBlockStateId
        );

        return true;
    }
    public placeBlock(): boolean {
        const reach = this.attributes.getOrThrow("base:reach_distance", null);
        if(!this.targetedBlock.hit || this.targetedBlock.distance > reach) return false;

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
        } else if(!this.infiniteItems) {
            holdingStack.mergeInto(ItemStack.empty(), 1);
        }

        return true;
    }

    public useHand(): boolean {
        const reach = this.attributes.getOrThrow("base:reach_distance", null);

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

        this.selectedSlotData?.entry?.events.runTrigger("base:item/break_block", cursor);
        if(cursor.defaultPrevented) return false;

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
        } else if(this.targetedBlock.hit && this.targetedBlock.distance <= reach) {
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

    public getMiningSpeed() {
        const cursor = this.createEventCursor();
        cursor.x = this.targetedBlock.voxel.x;
        cursor.y = this.targetedBlock.voxel.y;
        cursor.z = this.targetedBlock.voxel.z;
        
        return this.attributes.getOrThrow("base:mining_speed", cursor);
    }

    public setSelectedSlot(slot: number) {
        this.selectedSlot = slot;

        if(this.selectedSlotData?.entry instanceof Item) {
            this.attributes.removeModifierMap(this.selectedSlotData.entry.attributes);
        }
        this.selectedSlotData = null;

        const inventorySlot = this.inventory.slots[slot];
        if(inventorySlot == null) return;

        this.selectedSlotData = { stack: inventorySlot.stack };

        const item = itemRegistry.get(inventorySlot.stack.item);
        if(item != null) {
            this.attributes.addModifierMap(item.attributes);
            this.selectedSlotData.entry = item;

            return;
        }

        const blockState = blockStateRegistry.get(inventorySlot.stack.item);
        if(blockState != null) {
            this.selectedSlotData.entry = blockState;
        }
    }

    public pickBlock() {
        if(this.targetedBlock.hit) {
            const voxelPos = this.targetedBlock.voxel;
            const blockStateId = this.world.getBlockState(voxelPos.x, voxelPos.y, voxelPos.z);
            const blockState = blockStateRegistry.get(blockStateId);
            const pickBlockStateId = blockState?.pickBlockStateId ?? blockStateId;

            const existingSlot = this.inventory.findItem(pickBlockStateId);
            const selectedSlot = this.selectedSlot;

            if(existingSlot >= 0 && existingSlot <= 9) {
                this.setSelectedSlot(existingSlot);
            } else {
                let stack = this.inventory.slots[existingSlot]?.stack;
                if(stack == null && this.infiniteItems) {
                    stack = ItemStack.of(pickBlockStateId, 1);
                    stack.item = pickBlockStateId;
                    stack.quantity = 1;
                }

                if(stack != null) {
                    this.inventory.slots[selectedSlot]?.stack.swap(stack);
                }
            }
        }
    }

    public pickupNearbyItems(time: Time, magnetRadius: number, magnetStrength: number, pickupRadius: number, pickupMinHeight: number, pickupMaxHeight: number) {
        const minX = (this.position.x - magnetRadius) >> 4;
        const minY = (this.position.y - magnetRadius) >> 4;
        const minZ = (this.position.z - magnetRadius) >> 4;
        const maxX = (this.position.x + magnetRadius) >> 4;
        const maxY = (this.position.y + magnetRadius) >> 4;
        const maxZ = (this.position.z + magnetRadius) >> 4;

        const magnetRadiusSquared = magnetRadius * magnetRadius;
        const pickupRadiusSquared = pickupRadius * pickupRadius;

        const magnetDirection = new Vector3;

        const targetPosition = this.position.clone();
        targetPosition.y += (this.aabb.hitbox.min.y + this.aabb.hitbox.max.y) / 2;

        let pickedUpStacks = new Array<ItemStack>;

        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    const chunk = this.world.getChunk(x, y, z);
                    if(chunk == null) continue;

                    for(const entity of chunk.entities) {
                        if(!(entity instanceof ItemEntity)) continue;
                        if(entity.pickupCooldown > 0) continue;

                        const distanceSquared = (entity.position.x - targetPosition.x) ** 2 + (entity.position.z - targetPosition.z) ** 2;
                        const verticalDistance = entity.position.y - this.position.y;
                        if(
                            distanceSquared > magnetRadiusSquared ||
                            verticalDistance < pickupMinHeight ||
                            verticalDistance > pickupMaxHeight
                        ) continue;

                        if(distanceSquared < pickupRadiusSquared) {
                            const pickedUpStack = entity.getStack().clone();
                            const changed = entity.inventory.dump(this.inventory);

                            pickedUpStack.quantity = changed;
                            pickedUpStacks.push(pickedUpStack);
                            
                            if(entity.inventory.isEmpty()) {
                                entity.removeFromWorld();
                            }
                        } else {
                            magnetDirection.copy(targetPosition);
                            magnetDirection.sub(entity.position);

                            magnetDirection.normalize();
                            magnetDirection.multiplyScalar(magnetStrength);

                            entity.velocity.copy(magnetDirection);
                        }
                    }
                }
            }
        }

        return pickedUpStacks;
    }

    public getLookDirection(out = new Vector3) {
        out.set(0, 0, -1);
        return out.applyEuler(new Euler(this.pitch, -this.yaw, 0, "YZX"));
    }

    public dropItem(stack: ItemStack, max = Infinity) {
        const direction = this.getLookDirection();
        direction.normalize();

        const entity = new ItemEntity(this.world);
        entity.position.set(
            this.position.x,
            this.position.y + this.eyeHeight - 0.5,
            this.position.z,
        );
        entity.velocity.set(
            direction.x * 10 + this.velocity.x,
            direction.y * 10 + this.velocity.y,
            direction.z * 10 + this.velocity.z
        );

        const droppingStack = stack.split(max);
        entity.inventory.addStack(droppingStack);
        droppingStack.mergeInto(stack); // return leftover non-dropped items to the inventory

        entity.pickupCooldown = 2;

        this.world.addEntity(entity);
    }

    public tick(time: Time): void {
        if(this.flying && !this.canFly) this.setFlying(false);

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

        const direction = this.getLookDirection();
        
        if(this.gliding && !this.flying) {
            this.velocity.add(direction.clone().add(new Vector3(0, 0.5, 0)).normalize().multiplyScalar(time.deltaTime * 50));
        }

        const raycaster = new VoxelRaycaster(this.world, this.world.physicsDataCache);

        const origin = this.position.clone();
        origin.y += this.eyeHeight;

        this.runsMovementTriggers = true;
        if(this.crouching || this.flying) {
            this.runsMovementTriggers = false;
        }

        raycaster.cast(origin, direction, this.targetedBlock);
    }

    public override serialize(): SerializedPlayerEntity {
        return Object.assign(super.serialize(), {
            id: this.id,
            inventory: this.inventory.serialize(),
            pointerInventory: this.pointerInventory.serialize(),
            selectedSlot: this.selectedSlot,
            pitch: this.pitch,
            yaw: this.yaw,
        });
    }
    public override deserialize(data: Partial<SerializedPlayerEntity>) {
        data.type ??= this.type;
        const parsedData = SerializedPlayerEntity.parse(data);
        super.deserialize(parsedData);

        this.id = parsedData.id;
        if(parsedData.inventory) this.inventory.deserialize(parsedData.inventory);
        if(parsedData.pointerInventory) this.pointerInventory.deserialize(parsedData.pointerInventory);
        this.setSelectedSlot(parsedData.selectedSlot);

        this.pitch = parsedData.pitch;
        this.yaw = parsedData.yaw;
    }
}