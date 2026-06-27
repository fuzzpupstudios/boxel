import { Vector3 } from "three";
import { tileRegistry } from "../block/blockRegistry";
import { type Tickable } from "../entity/entity";
import type { WorldRenderer } from "../rendering/worldRenderer";
import { TerrainGenerator } from "./terrainGenerator";
import { VoxelChunk, VoxelGrid } from "./voxelGrid";

export class Chunk {
    public constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number,
        public readonly tiles: VoxelChunk,
    ) {}
}

export class World {
    public readonly tiles = new VoxelGrid;
    public readonly tickables = new Set<Tickable>;
    public readonly gravity = new Vector3(0, -32, 0);
    public renderer: WorldRenderer | null = null;
    private readonly chunks = new Map<number, Chunk>;
    private terrainGenerator: TerrainGenerator = TerrainGenerator.DEFAULT;
    public seed: number = (Math.random() * (2 ** 31 - 1)) | 0;

    public setTerrainGenerator(terrainGenerator: TerrainGenerator) {
        this.terrainGenerator = terrainGenerator;
    }

    public generateColumn(columnX: number, columnY: number, columnZ: number) {
        this.terrainGenerator.generateColumn(this, columnX, columnY, columnZ);
    }

    public getChunk(chunkX: number, chunkY: number, chunkZ: number) {
        const chunkKey = VoxelGrid.encodeChunkKey(chunkX, chunkY, chunkZ);

        // Check if the chunk is cached in the world
        let chunk = this.chunks.get(chunkKey);
        if(chunk != null) return chunk;

        // Otherwise, try to make a new chunk from existing tiles
        const tileChunk = this.tiles.getChunk(chunkX, chunkY, chunkZ);
        if(tileChunk != null) {
            chunk = new Chunk(chunkX, chunkY, chunkZ, tileChunk);
            this.chunks.set(chunkKey, chunk);
            return chunk;
        }

        // Otherwise, the chunk data doesn't exist, so return null
        return null;
    }

    public getBlockStateKey(x: number, y: number, z: number): string {
        const tile = this.tiles.getTile(x, y, z);
        const stateKey = tileRegistry.get(tile);

        if(stateKey == null) throw new ReferenceError(
            "Block state for tile " + tile + " does not exist");

        return stateKey;
    }

    public setBlockStateKey(x: number, y: number, z: number, stateKey: string, markDirty = true) {
        const tile = tileRegistry.findKey(stateKey);
        if(tile == null) throw new ReferenceError(
            "Block state " + stateKey + " is not registered");
        
        this.tiles.setTile(x, y, z, tile);

        if(!markDirty) return;
        if(this.renderer === null) return;

        for(let chunkX = (x - 1) >> 4; chunkX <= (x + 1) >> 4; chunkX++) {
            for(let chunkY = (y - 1) >> 4; chunkY <= (y + 1) >> 4; chunkY++) {
                for(let chunkZ = (z - 1) >> 4; chunkZ <= (z + 1) >> 4; chunkZ++) {
                    const chunk = this.getChunk(chunkX, chunkY, chunkZ);
                    if(chunk == null) continue;

                    this.renderer.markDirty(chunk);
                }
            }
        }
    }
    
    public markChunkDirty(chunkX: number, chunkY: number, chunkZ: number) {
        if(this.renderer === null) return;
        
        const chunk = this.getChunk(chunkX, chunkY, chunkZ);
        if(chunk == null) return;

        this.renderer.markDirty(chunk);
    }
}