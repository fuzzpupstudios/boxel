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

export class ItemEntity extends Entity {
    public readonly type = "base:item";

    public readonly stack = ItemStack.empty();
    private readonly renderer: ItemEntityRenderer | null;
    private geometryInstanceId?: number;
    private matrix = new Matrix4;
    private lightColor = new Color;
    private rotationPhase = Math.random() * 10;
    public pickupCooldown = 0;

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
    }

    public override render(time: Time) {
        if(this.geometryInstanceId == null) return;
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
        this.world.lightingManager.getColorAt(
            Math.floor(this.renderPosition.x),
            Math.floor(this.renderPosition.y),
            Math.floor(this.renderPosition.z),
            this.lightColor
        );

        this.renderer.batchedMesh.setMatrixAt(this.geometryInstanceId, this.matrix);
        this.renderer.batchedMesh.setColorAt(this.geometryInstanceId, this.lightColor);
    }

    public override destroy() {
        super.destroy();

        if(this.geometryInstanceId != null && this.renderer != null) {
            this.renderer.deleteInstance(this.geometryInstanceId);
        }
    }

    public updateDisplayItem() {
        if(this.renderer == null) return;

        if(this.geometryInstanceId != null) {
            this.renderer.deleteInstance(this.geometryInstanceId);
        }
        this.geometryInstanceId = this.renderer.addInstance(this.stack.item);
        this.renderer.batchedMesh.getMatrixAt(this.geometryInstanceId, this.matrix);
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