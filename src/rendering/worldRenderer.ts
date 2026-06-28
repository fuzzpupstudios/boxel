import { MathUtils, Mesh, Scene } from "three";
import type { Time } from "../time";
import { Chunk, World } from "../world/world";
import { ChunkMesher } from "./chunkMesher";
import type { TextureAtlas } from "../assets/textureAtlas";
import { vec4, texture, uv, normalGeometry, vec3 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

export class WorldRenderer {
    public minChunkUpdates = 4;
    public maxChunkUpdates = 32;
    public readonly root = new Scene;
    private readonly dirtyChunks = new Set<Chunk>;
    private readonly priorityDirtyChunks = new Set<Chunk>;
    private readonly renderedChunks = new Map<Chunk, Mesh>;
    private readonly chunkMesher: ChunkMesher;
    private readonly terrainMaterial: MeshBasicNodeMaterial;

    public constructor(
        public readonly world: World,
        private readonly textureAtlas: TextureAtlas
    ) {
        this.chunkMesher = new ChunkMesher(world);

        {
            const terrainColor = texture(textureAtlas.packedTexture, uv()).toVar("terrainColor");
            const shadow = normalGeometry.dot(vec3(0.8, 1.2, 0.5).normalize()).remap(-1, 1, 0, 1).toVar("shadow");
            const colorNode = vec4(terrainColor.rgb.mul(shadow), terrainColor.a)
            this.terrainMaterial = new MeshBasicNodeMaterial({ colorNode, alphaTest: 0.1 });
        }

        world.renderer = this;
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
            if(geometrySize > 0) {
                mesh = new Mesh(geometry, this.terrainMaterial);
                this.renderedChunks.set(chunk, mesh);
                mesh.matrixAutoUpdate = false;

                mesh.position.set(chunk.x << 4, chunk.y << 4, chunk.z << 4);
                mesh.updateMatrix();
                this.root.add(mesh);
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