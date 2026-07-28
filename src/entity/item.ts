import Alea from "alea";
import { Box3, Color, Matrix4, Vector3 } from "three";
import z from "zod";
import { ItemStack, SerializedItemStack } from "../item/itemStack";
import { AABB } from "../physics/AABB";
import type { PhysicsDataCache } from "../physics/physicsDataCache";
import type { Time } from "../time";
import type { World } from "../world/world";
import { Entity, SerializedEntity } from "./entity";
import type { ItemEntityRenderer } from "./itemEntityRenderer";

export type SerializedItemEntity = z.infer<typeof SerializedItemEntity>;
export const SerializedItemEntity = SerializedEntity.extend({
    stack: SerializedItemStack.default({ item: "base:air[default]", quantity: 0 }),
    pickupCooldown: z.number().default(0)
});

const rand = Alea(5198023);

const multistackOffsetX = [ 0 ];
const multistackOffsetY = [ 0 ];
const multistackOffsetZ = [ 0 ];

for(let i = 0; i < 1000; i++) {
    const offset = new Vector3(
        rand() - 0.5,
        rand() - 0.5,
        rand() - 0.5
    );
    const scale = rand() * 0.1 + 0.15;
    offset.normalize();
    multistackOffsetX.push(offset.x * scale);
    multistackOffsetY.push(offset.y * scale);
    multistackOffsetZ.push(offset.z * scale);
}

export class ItemEntity extends Entity {
    public readonly type = "base:item";

    public readonly stack = ItemStack.empty();
    private readonly renderer: ItemEntityRenderer | null;
    private geometryInstanceIds = new Array<number>;
    private readonly matrix = new Matrix4;
    private readonly tempMatrix = new Matrix4;
    private lightColor = new Color;
    private rotationPhase = Math.random() * 10;
    public pickupCooldown = 0;
    private mergeCheckCooldown = Math.random();

    public constructor(
        world: World
    ) {
        super(world);

        this.renderer = world.renderer?.entityRenderer.itemEntityRenderer ?? null;
        
        this.updateDisplayItem();
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
    }

    private mergeNearbyItems(radius: number) {
        const minX = (this.position.x - radius) >> 4;
        const minY = (this.position.y - radius) >> 4;
        const minZ = (this.position.z - radius) >> 4;
        const maxX = (this.position.x + radius) >> 4;
        const maxY = (this.position.y + radius) >> 4;
        const maxZ = (this.position.z + radius) >> 4;

        const raidusSquared = radius * radius;
        let changed = false;

        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    const chunk = this.world.getChunk(x, y, z);
                    if(chunk == null) continue;
                    
                    for(const entity of chunk.entities) {
                        if(!(entity instanceof ItemEntity)) continue;
                        if(entity.stack.item != this.stack.item) continue;
                        if(entity == this) continue;

                        if(entity.position.distanceToSquared(this.position) < raidusSquared) {
                            entity.stack.mergeInto(this.stack);
                            changed = true;


                            if(entity.stack.isEmpty()) {
                                entity.removeFromWorld();
                            } else {
                                return;
                            }
                        }
                    }
                }
            }
        }

        if(changed) {
            this.updateDisplayItem();
        }
    }

    public override render(time: Time) {
        if(this.renderer == null) return;

        this.rotationPhase += time.deltaTime;
        
        const angle = this.rotationPhase * Math.PI * 0.5;
        const offsetY = Math.sin(this.rotationPhase * Math.PI * 2 / 3) * 0.1 + 0.3;

        this.world.lightingManager.getColorAt(
            Math.floor(this.renderPosition.x),
            Math.floor(this.renderPosition.y),
            Math.floor(this.renderPosition.z),
            this.lightColor
        );

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

    public override destroy() {
        super.destroy();

        if(this.renderer != null) {
            for(const id of this.geometryInstanceIds) {
                this.renderer.deleteInstance(id);
            }
        }
    }

    public updateDisplayItem() {
        if(this.renderer == null) return;

        const count = Math.ceil(((this.stack.quantity / 1000) ** 0.34) * 10);

        for(const i of this.geometryInstanceIds.splice(0)) {
            this.renderer.deleteInstance(i);
        }

        for(let i = 0; i < count; i++) {
            this.geometryInstanceIds.push(this.renderer.addInstance(this.stack.item));
        }
    }
    
    public override serialize(): SerializedItemEntity {
        return Object.assign(super.serialize(), {
            stack: this.stack.serialize(),
            pickupCooldown: this.pickupCooldown
        });
    }
    public override deserialize(data: Partial<SerializedItemEntity>) {
        data.type ??= this.type;
        const parsedData = SerializedItemEntity.parse(data);
        super.deserialize(parsedData);
        
        this.stack.deserialize(parsedData.stack);
        this.pickupCooldown = parsedData.pickupCooldown;

        this.updateDisplayItem();
    }
}