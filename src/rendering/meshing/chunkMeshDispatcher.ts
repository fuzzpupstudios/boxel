import { Box3, BufferAttribute, BufferGeometry, Float32BufferAttribute, IntType, Uint16BufferAttribute, Uint8BufferAttribute, Vector3 } from "three/webgpu";
import { ThreadDispatcher } from "../../multithreading/dispatcher";
import { ThreadWorker } from "../../multithreading/worker";
import type { World } from "../../world/world";
import { createChunkGeometryData, createTileCacheData, type ChunkGeometryData, type MesherWorkerConfig } from "./meshWorkerConfig";
import { TileCache, type MeshCache } from "./tileRendering";

type MesherThread = ThreadWorker<MesherWorkerConfig>;

export class ChunkMeshDispatcher extends ThreadDispatcher<MesherWorkerConfig> {
    private readonly tileCaches = new WeakMap<MesherThread, TileCache>;
    private readonly geometryData = new WeakMap<MesherThread, ChunkGeometryData>;

    public constructor(
        public readonly world: World,
        public readonly meshCache: MeshCache,
    ) {
        super(new URL("./meshWorker.ts", import.meta.url))
    }

    protected override createWorkerConfig(worker: MesherThread): MesherWorkerConfig {
        // ~150 MB maximum mesh size (should be more than enough..?)
        const maxVertices = 2 ** 22;
        const lightChannelCount = this.world.lightingManager.getChannelCount();
        const geometryData = createChunkGeometryData(maxVertices, lightChannelCount);
        this.geometryData.set(worker, geometryData);

        const tileCacheData = createTileCacheData(lightChannelCount);
        const tileCache = new TileCache(tileCacheData, this.meshCache);
        this.tileCaches.set(worker, tileCache);

        return {
            meshCache: this.meshCache.serialize(),
            tileCache: tileCacheData,
            geometryData,
        };
    }

    public async mesh(chunkX: number, chunkY: number, chunkZ: number): Promise<BufferGeometry | null> {
        const chunkTiles = this.world.tiles.getChunk(chunkX, chunkY, chunkZ) ?? null;
        if(chunkTiles == null) return null;

        if(chunkTiles.entireSingleTile && this.meshCache.skipRenderMeshes.has(chunkTiles.palette[0])) {
            return null;
        }

        const worker = await this.getWorker();
        
        try {
            const tileCache = this.tileCaches.get(worker)!;
            const geometryData = this.geometryData.get(worker)!;
            
            // Optimize: use an 18x18x18 "halo" tile buffer
            // to cache tiles, so VoxelGrid#tileAt() isn't
            // called so frequently
            tileCache.update(this.world, chunkX, chunkY, chunkZ, chunkTiles);

            worker.send({ type: "mesh" });
            const event = await worker.once("mesh");

            if(event.vertexCount == 0) {
                return null;
            } else {
                return this.createMesh(geometryData, event.vertexCount);
            }
        } finally {
            this.returnWorker(worker);
        }
    }

    private createMesh(geometryData: ChunkGeometryData, vertexCount: number) {
        const geometry = new BufferGeometry();

        // Copy face type data to Uint16Array and make it a Uint16BufferAttribute
        const faceTypeAttribute = new Uint16BufferAttribute(geometryData.faceTypes.subarray(0, vertexCount), 1);
        faceTypeAttribute.gpuType = IntType;
        
        // Use interleaved buffer data to set vertex attributes
        geometry.setAttribute("position", new Float32BufferAttribute(geometryData.positions.subarray(0, vertexCount * 3), 3));
        geometry.setAttribute("uv", new Float32BufferAttribute(geometryData.uvs.subarray(0, vertexCount * 2), 2));
        geometry.setAttribute("normal", new Float32BufferAttribute(geometryData.normals.subarray(0, vertexCount * 3), 3));
        geometry.setAttribute("aoFactor", new Float32BufferAttribute(geometryData.aoFactors.subarray(0, vertexCount), 1));
        
        for(let i = 0; i < geometryData.lightFactors.length; i++) {
            const attribute = new Uint8BufferAttribute(geometryData.lightFactors[i].subarray(0, vertexCount), 1);
            attribute.gpuType = IntType;
            geometry.setAttribute("light" + i, attribute);
        }
        geometry.setAttribute("faceType", faceTypeAttribute);

        // Set indices
        geometry.setIndex(new BufferAttribute(geometryData.indices.subarray(0, vertexCount * 6/4), 1));

        geometry.boundingBox = new Box3(
            new Vector3(0, 0, 0),
            new Vector3(16, 16, 16),
        );

        return geometry;
    }
}