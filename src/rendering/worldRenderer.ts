import { MathUtils, Mesh, Scene } from "three";
import { attribute, cameraPosition, float, luminance, mix, normalGeometry, positionWorld, texture, uint, uniform, uv, varying, vec3, vec4, vertexStage } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import type { TextureAtlas } from "../assets/textureAtlas";
import type { Time } from "../time";
import { Chunk, World } from "../world/world";
import { ChunkMesher } from "./chunkMesher";
import { lightMix, lightUnpack } from "./lightUtils";

export class WorldRenderer {
    public minChunkUpdates = 4;
    public maxChunkUpdates = 32;
    public readonly fogDistance = uniform(64);
    public readonly skyColor = uniform(vec3(1.0, 1.0, 1.0));
    public readonly root = new Scene;
    public readonly chunkMesher: ChunkMesher;
    private readonly dirtyChunks = new Set<Chunk>;
    private readonly priorityDirtyChunks = new Set<Chunk>;
    private readonly renderedChunks = new Map<Chunk, Mesh | null>;
    private readonly terrainMaterial: MeshBasicNodeMaterial;
    public readonly renderedChunkKeyList = new Set<number>;

    public constructor(
        public readonly world: World,
        private readonly textureAtlas: TextureAtlas
    ) {
        this.chunkMesher = new ChunkMesher(world);

        {
            const light = uint(attribute("lighting") as any);
            const lightColor = varying(vertexStage(lightUnpack(light)), "lightColor");

            const terrainColor = texture(textureAtlas.packedTexture, uv()).toVar("terrainColor");
            const shadow = normalGeometry.dot(vec3(0.6, 1.0, 0.2).normalize()).remap(-1, 1, 0, 1).toVar("shadow");
            const playerDistanceNode = positionWorld.distance(cameraPosition).remapClamp(this.fogDistance.mul(0.8), this.fogDistance, 0, 1);
            
            const colorNode = vec4(
                mix(
                    terrainColor.rgb.mul(lightMix(this.skyColor, shadow, lightColor)),
                    vec3(1, 1, 1),
                    playerDistanceNode
                ),
                terrainColor.a
            );
            this.terrainMaterial = new MeshBasicNodeMaterial({ colorNode, alphaTest: 0.1 });
        }

        world.setRenderer(this);
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
            const iterator = this.dirtyChunks.values();

            let i = 0;
            let next: IteratorResult<Chunk>;
            do {
                next = iterator.next();
                if(next.done) break;
                
                this.renderChunk(next.value);
                this.dirtyChunks.delete(next.value);

                i++;
            } while(i < todo);
        }

        for(const priorityDirtyChunk of this.priorityDirtyChunks) {
            this.renderChunk(priorityDirtyChunk);
        }
        this.priorityDirtyChunks.clear();
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
                this.root.add(mesh);
            } else {
                this.renderedChunks.set(chunk, null);
            }
        } else {
            mesh.geometry.dispose();

            if(geometrySize > 0) {
                mesh.geometry = geometry;
                if(mesh.parent == null) {
                    this.root.add(mesh);
                }
            } else {
                mesh.removeFromParent();
            }
        }
    }
}