import Alea from "alea";
import { Box3, Color, Matrix4, Vector3 } from "three";
import z from "zod";
import { Inventory, InventorySlot } from "../item/inventory";
import { ItemStack, SerializedItemStack } from "../item/itemStack";
import { AABB } from "../physics/AABB";
import type { PhysicsDataCache } from "../physics/physicsDataCache";
import type { Time } from "../time";
import type { World } from "../world/world";
import { Entity, SerializedEntity } from "./entity";
import type { ItemEntityRenderer } from "./itemEntityRenderer";
import type { SignalConnection } from "typed-signals";
import { blockStateRegistry } from "../block/blockRegistry";

export type SerializedItemEntity = z.infer<typeof SerializedItemEntity>;
export const SerializedItemEntity = SerializedEntity.extend({
    stack: SerializedItemStack.default({ item: "base:air[default]", quantity: 0 }),
    pickupCooldown: z.number().default(0)
});

const rand = Alea(5198023);

const multistackOffsetX = new Float32Array(1000);
multistackOffsetX[0] = 0;
const multistackOffsetY = new Float32Array(1000);
multistackOffsetY[0] = 0;
const multistackOffsetZ = new Float32Array(1000);
multistackOffsetZ[0] = 0;

for(let i = 1; i < 1000; i++) {
    const offset = new Vector3(
        rand() - 0.5,
        rand() - 0.5,
        rand() - 0.5
    );
    const scale = rand() * 0.1 + 0.15;
    offset.normalize();
    multistackOffsetX[i] = offset.x * scale;
    multistackOffsetY[i] = offset.y * scale;
    multistackOffsetZ[i] = offset.z * scale;
}

export class ItemEntity extends Entity {
    public readonly type = "base:item";

    public readonly inventory: Inventory;
    private readonly renderer: ItemEntityRenderer | null;
    private geometryInstanceIds = new Array<number>;
    private readonly matrix = new Matrix4;
    private readonly tempMatrix = new Matrix4;
    private lightColor = new Color;
    private rotationPhase = Math.random() * 10;
    public pickupCooldown = 0;
    private mergeCheckCooldown = Math.random();
    private insideCheckCooldown = Math.random();
    private onInventoryUpdate: SignalConnection;

    public static spewInventory(
        inventory: Inventory,
        world: World,
        x: number, y: number, z: number
    ) {
        while(!inventory.isEmpty()) {
            const item = new ItemEntity(world);

            item.position.set(
                x + Math.random() * 0.5 - 0.25,
                y + Math.random() * 0.5 - 0.25,
                z + Math.random() * 0.5 - 0.25,
            );
            item.velocity.set(
                Math.random() * 6 - 3,
                6,
                Math.random() * 6 - 3,
            );

            inventory.dump(item.inventory);
            
            world.addEntity(item);
        }
    }

    public constructor(
        world: World
    ) {
        super(world);

        this.renderer = world.renderer?.entityRenderer.itemEntityRenderer ?? null;

        this.inventory = new Inventory();
        this.inventory.addSlot(new InventorySlot(ItemStack.empty()));
        this.onInventoryUpdate = this.inventory.onUpdate.connect(() => {
            if(this.inventory.slots[0].stack.isEmpty()) {
                this.removeFromWorld();
            } else {
                this.updateDisplayItem();
            }
        });
        
        this.updateDisplayItem();
        this.updateLightColor();
    }

    protected override createAABB(world: World, physicsData: PhysicsDataCache): AABB {
        return new AABB(
            new Box3(
                new Vector3(-0.2, 0, -0.2),
                new Vector3(0.2, 0.4, 0.2)
            ),
            world, physicsData
        )
    }

    public override tick(time: Time): void {
        super.tick(time);

        if(this.pickupCooldown > 0) {
            this.pickupCooldown -= time.deltaTime;
        }
        this.mergeCheckCooldown -= time.deltaTime;
        if(this.mergeCheckCooldown < 0) {
            this.mergeCheckCooldown += 1;

            this.mergeNearbyItems(1);
        }

        this.insideCheckCooldown -= time.deltaTime;
        if(this.insideCheckCooldown < 0) {
            const blockX = Math.floor(this.position.x);
            const blockY = Math.floor(this.position.y);
            const blockZ = Math.floor(this.position.z);
            const insideBlockStateId = this.world.getBlockState(blockX, blockY, blockZ);
            const insideBlockState = blockStateRegistry.get(insideBlockStateId);
            
            if(insideBlockState?.collider.isPointInside(new Vector3(
                this.position.x - blockX,
                this.position.y - blockY,
                this.position.z - blockZ
            ))) {
                this.position.y += 0.25;
                this.velocity.y = 5;
            } else {
                this.insideCheckCooldown += 1;
            }
        }

        this.updateLightColor();
    }

    public getStack() {
        return this.inventory.slots[0].stack;
    }

    private mergeNearbyItems(radius: number) {
        const minX = (this.position.x - radius) >> 4;
        const minY = (this.position.y - radius) >> 4;
        const minZ = (this.position.z - radius) >> 4;
        const maxX = (this.position.x + radius) >> 4;
        const maxY = (this.position.y + radius) >> 4;
        const maxZ = (this.position.z + radius) >> 4;

        const radiusSquared = radius * radius;

        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    const chunk = this.world.getChunk(x, y, z);
                    if(chunk == null) continue;
                    
                    for(const entity of chunk.entities) {
                        if(!(entity instanceof ItemEntity)) continue;
                        if(entity == this) continue;
                        
                        if(entity.position.distanceToSquared(this.position) < radiusSquared) {
                            const transferred = this.inventory.dump(entity.inventory);
                            if(transferred == 0) continue;

                            this.removeFromWorld();
                        }
                    }
                }
            }
        }
    }

    public override render(time: Time) {
        if(this.renderer == null) return;

        this.rotationPhase += time.deltaTime;
        
        const angle = this.rotationPhase * Math.PI * 0.5;
        const offsetY = Math.sin(this.rotationPhase * Math.PI * 2 / 3) * 0.1 + 0.3;

        this.matrix.makeRotationY(angle);
        this.matrix.setPosition(
            this.renderPosition.x,
            this.renderPosition.y + offsetY,
            this.renderPosition.z
        );

        for(let i = 0; i < this.geometryInstanceIds.length; i++) {
            this.tempMatrix.makeTranslation(
                multistackOffsetX[i]!,
                multistackOffsetY[i]!,
                multistackOffsetZ[i]!
            );

            const id = this.geometryInstanceIds[i]!;
            this.renderer.batchedMesh.setMatrixAt(id, this.tempMatrix.multiplyMatrices(this.matrix, this.tempMatrix));
            this.renderer.batchedMesh.setColorAt(id, this.lightColor);
        }
    }

    private updateLightColor() {
        this.world.lightingManager.getColorAt(
            Math.floor(this.position.x),
            Math.floor(this.position.y),
            Math.floor(this.position.z),
            this.lightColor
        );
    }

    public override destroy() {
        super.destroy();

        if(this.renderer != null) {
            for(const id of this.geometryInstanceIds) {
                this.renderer.deleteInstance(id);
            }
        }
    }

    private updateDisplayItem() {
        if(this.renderer == null) return;
        const stack = this.getStack();

        let count = Math.round((((stack.quantity) / 512) ** 0.34) * 10);
        if(count > 12) count = 12;

        for(const i of this.geometryInstanceIds.splice(0)) {
            this.renderer.deleteInstance(i);
        }

        for(let i = 0; i < count; i++) {
            this.geometryInstanceIds.push(this.renderer.addInstance(stack.item));
        }
    }
    
    public override serialize(): SerializedItemEntity {
        return Object.assign(super.serialize(), {
            stack: this.getStack().serialize(),
            pickupCooldown: this.pickupCooldown
        });
    }
    public override deserialize(data: Partial<SerializedItemEntity>) {
        data.type ??= this.type;
        const parsedData = SerializedItemEntity.parse(data);
        super.deserialize(parsedData);
        
        this.getStack().deserialize(parsedData.stack);
        this.pickupCooldown = parsedData.pickupCooldown;

        this.inventory.onUpdate.emit(0);
    }

    public override removeFromWorld() {
        super.removeFromWorld();
        this.onInventoryUpdate.disconnect();
    }
}