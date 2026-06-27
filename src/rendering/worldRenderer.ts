import { Mesh, Scene } from "three";
import type { Time } from "../time";
import { Chunk, World } from "../world/world";
import { ChunkMesher } from "./chunkMesher";
import type { TextureAtlas } from "../assets/textureAtlas";
import { vec4, texture, uv, normalGeometry, vec3 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";

export class WorldRenderer {
    public readonly root = new Scene;
    private readonly dirtyChunks = new Set<Chunk>;
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

    public markDirty(chunk: Chunk) {
        this.dirtyChunks.add(chunk);
    }

    public render(time: Time) {
        const todo = Math.min(128, Math.max(4, this.dirtyChunks.size / 3));
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
    }

    private renderChunk(chunk: Chunk) {
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