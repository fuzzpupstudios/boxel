import { BatchedMesh, Color } from "three";
import { Fn } from "three/src/nodes/TSL.js";
import { Discard, If, mix, normalWorld, vec4 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import type { WorldRenderer } from "../rendering/worldRenderer";
import type { ItemHologramProvider } from "./itemHologram";

export class ItemEntityRenderer {
    public readonly batchedMesh: BatchedMesh;
    private readonly material: MeshBasicNodeMaterial;
    private readonly geometryIndices = new Map<string, number>;
    private readonly defaultGeometryIndex: number;

    public constructor(
        worldRenderer: WorldRenderer,
        hologramProvider: ItemHologramProvider
    ) {
        {
            const textureColor = hologramProvider.colorNode;

            const shadow = worldRenderer.sky.createSunShadowNode(normalWorld).toVar("shadow");

            const fogFactor = worldRenderer.fogFactor.toVar();
            const fogColor = worldRenderer.sky.fogColor;

            this.material = new MeshBasicNodeMaterial({
                colorNode: Fn(() => {
                    If(fogFactor.greaterThanEqual(1), () => Discard());

                    return mix(
                        vec4(textureColor.rgb.mul(shadow), textureColor.a),
                        vec4(fogColor, 1),
                        fogFactor
                    )
                })(),
                transparent: true,
                alphaTest: 0.5
            });
        }
        this.batchedMesh = new BatchedMesh(4096, 32768, 65536, this.material);
        this.batchedMesh.frustumCulled = false;
        
        for(const [ item, geometry ] of hologramProvider.entries()) {
            this.geometryIndices.set(item, this.batchedMesh.addGeometry(geometry));
        }
        this.defaultGeometryIndex = this.geometryIndices.get("base:axes[default]") ?? 0;

        // BatchedMesh only allocates its per-instance colors texture on the first setColorAt()
        // call. If this mesh renders (and its material's shader compiles) even once before that,
        // the per-instance color tint is permanently compiled out and later setColorAt() calls
        // have no visible effect. Force the texture to exist before the mesh is ever drawn.
        const warmupInstance = this.batchedMesh.addInstance(this.defaultGeometryIndex);
        this.batchedMesh.setColorAt(warmupInstance, new Color(1, 1, 1));
        this.batchedMesh.deleteInstance(warmupInstance);
    }

    
    public addInstance(item: string) {
        // prevent a crash for ludicrous amounts of items
        if(this.batchedMesh.instanceCount == this.batchedMesh.maxInstanceCount) return 0;

        const index = this.geometryIndices.get(item) ?? this.defaultGeometryIndex;
        const instanceId = this.batchedMesh.addInstance(index);

        return instanceId;
    }
    public deleteInstance(instanceId: number) {
        return this.batchedMesh.deleteInstance(instanceId);
    }
    public dispose() {
        this.batchedMesh.removeFromParent();
        this.material.dispose();
        this.batchedMesh.dispose();
    }
}