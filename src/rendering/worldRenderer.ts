import { MathUtils, Mesh, Scene } from "three";
import { Fn } from "three/src/nodes/TSL.js";
import { attribute, cameraPosition, Discard, If, mix, normalGeometry, pass, positionWorld, texture, uniform, uv, vec3, vec4 } from "three/tsl";
import { MeshBasicNodeMaterial, Node, PerspectiveCamera } from "three/webgpu";
import type { TextureAtlases } from "../boxel";
import type { Assets } from "../data/assets";
import { EntityRenderer } from "../entity/entityRenderer";
import type { Time } from "../time";
import { Chunk, World } from "../world/world";
import { BlockBreakParticleEngine } from "./blockBreakParticleEngine";
import { BlockStateOutline } from "./blockStateOutline";
import { ChunkMesher } from "./chunkMesher";
import { createLightColorNode, createSunShadowNode } from "./lightUtils";
import { Sky } from "./sky";

export class WorldRenderer {
    public minChunkUpdates = 4;
    public maxChunkUpdates = 16;
    public readonly fogDistance = uniform(64);
    public readonly scene = new Scene;
    public readonly sky: Sky;
    public readonly chunkMesher: ChunkMesher;
    public readonly dirtyChunks = new Set<Chunk>;
    public readonly priorityDirtyChunks = new Set<Chunk>;
    public readonly renderedChunks = new Map<Chunk, Mesh | null>;
    public readonly entityRenderer: EntityRenderer;
    private readonly terrainMaterial: MeshBasicNodeMaterial;
    public readonly renderedChunkKeyList = new Set<number>;
    public readonly targetedBlock = new BlockStateOutline;
    public readonly blockBreakParticles: BlockBreakParticleEngine;
    public paused: boolean = true;

    public constructor(
        public readonly world: World,
        textureAtlases: TextureAtlases,
        public readonly camera: PerspectiveCamera,
        assets: Assets
    ) {
        {
            this.terrainMaterial = new MeshBasicNodeMaterial({
                colorNode: Fn(() => {
                    const terrainColor = texture(
                        textureAtlases.block.threeTexture, uv()
                    ).toVar("terrainColor");

                    const faceType = attribute<"uint">("faceType", "uint");
                    const lit = faceType.bitAnd(1).greaterThan(0);

                    If(terrainColor.a.lessThan(0.5), () => Discard());
                    
                    const ao = attribute("aoFactor", "float" as const).min(2).div(3).toVar("aoCalculated");

                    const shadow = createSunShadowNode(normalGeometry, this.sky).toVar("shadow");
                    const fogFactor = positionWorld.distance(cameraPosition).remapClamp(this.fogDistance.mul(0.8), this.fogDistance, 0, 1);

                    If(fogFactor.greaterThanEqual(1), () => Discard());
                    
                    const lightColor = createLightColorNode(this.world.lightingManager, shadow, ao).toVar("lightColor");

                    If(lit, () => {
                        lightColor.assign(vec3(1, 1, 1));
                    });

                    return mix(
                        terrainColor.rgb.mul(lightColor),
                        this.sky.fogColor,
                        fogFactor
                    );
                })(),
                transparent: true
            });
        }
        world.setRenderer(this);

        this.chunkMesher = new ChunkMesher(world);
        this.sky = new Sky(assets);
        this.blockBreakParticles = new BlockBreakParticleEngine(this.world, this, textureAtlases);
        this.entityRenderer = new EntityRenderer(this.scene, world, this, textureAtlases);

        this.scene.add(this.targetedBlock.mesh, this.blockBreakParticles.mesh);
    }

    public setPaused(paused: boolean) {
        this.paused = paused;
    }

    public create() {
        this.sky.create(this.world.seed);
    }

    public getRenderPass(): Node<"vec4"> {
        const sky = this.sky.renderPass;
        const ground = pass(this.scene, this.camera);
        return vec4(mix(sky.rgb, ground.rgb, ground.a), 1);
    }

    public markDirty(chunk: Chunk, priority: boolean = false) {
        if(priority) {
            this.priorityDirtyChunks.add(chunk);
        } else {
            this.dirtyChunks.add(chunk);
        }
    }

    public render(time: Time) {
        const todo = MathUtils.clamp(this.dirtyChunks.size / 3, this.minChunkUpdates, this.maxChunkUpdates);
        if(this.dirtyChunks.size > 0) {
            let i = 0;
            for(const chunk of this.dirtyChunks) {
                if(i++ > todo) break;

                this.renderChunk(chunk);
                this.dirtyChunks.delete(chunk);
            }
        }

        for(const priorityDirtyChunk of this.priorityDirtyChunks) {
            this.renderChunk(priorityDirtyChunk);
        }
        this.priorityDirtyChunks.clear();

        if(this.paused) return;
        
        this.blockBreakParticles.tick(time);
        this.sky.updateCamera(this.camera);

        this.sky.time.value = this.world.time;
        this.sky.update();
        
        this.entityRenderer.render(time);
    }

    public removeChunk(chunk: Chunk) {
        this.dirtyChunks.delete(chunk);
        this.priorityDirtyChunks.delete(chunk);
        const mesh = this.renderedChunks.get(chunk);
        if(mesh != null) {
            mesh.geometry.dispose();
            mesh.removeFromParent();
        }
        this.renderedChunks.delete(chunk);
        this.renderedChunkKeyList.delete(chunk.key);
    }

    private renderChunk(chunk: Chunk) {
        if(!this.renderedChunks.get(chunk)) {
            let surrounding = 0;
            for(let dx = -1; dx <= 1; dx++) {
                for(let dy = -1; dy <= 1; dy++) {
                    for(let dz = -1; dz <= 1; dz++) {
                        if(dx == 0 && dy == 0 && dz == 0) continue;

                        if(this.world.tiles.getChunk(chunk.x + dx, chunk.y + dy, chunk.z + dz)) {
                            surrounding++;
                        }
                    }
                }
            }
            if(surrounding != 26) return;
        }

        const geometry = this.chunkMesher.mesh(chunk.x, chunk.y, chunk.z);
        const geometrySize = geometry.getAttribute("position").array.byteLength;

        let mesh = this.renderedChunks.get(chunk);

        if(mesh == null) {
            this.renderedChunkKeyList.add(chunk.key);
            
            if(geometrySize > 0) {
                mesh = new Mesh(geometry, this.terrainMaterial);
                mesh.matrixAutoUpdate = false;
                
                this.renderedChunks.set(chunk, mesh);

                mesh.position.set(chunk.x << 4, chunk.y << 4, chunk.z << 4);
                mesh.updateMatrix();
                this.scene.add(mesh);
            } else {
                this.renderedChunks.set(chunk, null);
            }
        } else {
            mesh.geometry.dispose();

            if(geometrySize > 0) {
                mesh.geometry = geometry;
                if(mesh.parent == null) {
                    this.scene.add(mesh);
                }
            } else {
                mesh.removeFromParent();
            }
        }
    }
}