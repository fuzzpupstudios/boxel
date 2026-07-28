import { BatchedMesh, Color } from "three";
import { Fn } from "three/src/nodes/TSL.js";
import { Discard, If, mix, normalWorld, vec4 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { createSunShadowNode } from "../rendering/lightUtils";
import type { WorldRenderer } from "../rendering/worldRenderer";
import type { World } from "../world/world";
import type { ItemHologramProvider } from "./itemHologram";

export class ItemEntityRenderer {
    public readonly batchedMesh: BatchedMesh;
    private readonly geometryIndices = new Map<string, number>;
    private readonly defaultGeometryIndex: number;

    public constructor(
        public readonly world: World,
        public readonly worldRenderer: WorldRenderer,
        public readonly hologramProvider: ItemHologramProvider
    ) {
        this.batchedMesh = new BatchedMesh(4096, 32768, 65536, this.createMaterial());
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

    private createMaterial() {
        const worldRenderer = this.world.renderer!;
        const textureColor = this.hologramProvider.colorNode;

        const shadow = createSunShadowNode(normalWorld, worldRenderer.sky).toVar("shadow");

        return new MeshBasicNodeMaterial({
            colorNode: Fn(() => {
                const fogFactor = this.worldRenderer.fogFactor;

                If(fogFactor.greaterThanEqual(1), () => Discard());

                return mix(
                    vec4(textureColor.rgb.mul(shadow), textureColor.a),
                    vec4(this.worldRenderer.sky.fogColor, 1),
                    fogFactor
                )
            })(),
            transparent: true,
            alphaTest: 0.5
        });
    }
    public addInstance(item: string) {
        const index = this.geometryIndices.get(item) ?? this.defaultGeometryIndex;
        const instanceId = this.batchedMesh.addInstance(index);

        return instanceId;
    }
    public deleteInstance(instanceId: number) {
        return this.batchedMesh.deleteInstance(instanceId);
    }
}