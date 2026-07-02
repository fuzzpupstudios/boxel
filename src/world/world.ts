import { Vector3 } from "three";
import { tileRegistry } from "../block/blockRegistry";
import { type Tickable } from "../entity/entity";
import type { Player } from "../entity/player";
import type { PersistentWorld } from "../persistence/persistentWorld";
import type { WorldRenderer } from "../rendering/worldRenderer";
import type { Time } from "../time";
import { TerrainGenerator } from "./terrainGenerator";
import { VoxelChunk, VoxelGrid } from "./voxelGrid";

export class Chunk {
    public readonly key: number;

    public constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number,
        public readonly tiles: VoxelChunk,
    ) {
        this.key = VoxelGrid.encodeChunkKey(x, y, z);
    }

    public toString() {
        return `{Chunk x=${this.x} y=${this.y} z=${this.z}}`;
    }
}

export class World {
    public readonly tiles = new VoxelGrid;
    public readonly tickables = new Set<Tickable>;
    public readonly gravity = new Vector3(0, -32, 0);
    public renderer: WorldRenderer | null = null;
    public readonly chunks = new Map<number, Chunk>;
    private terrainGenerator: TerrainGenerator = TerrainGenerator.DEFAULT;
    public seed: number = (Math.random() * (2 ** 31 - 1)) | 0;
    public persistentWorld: PersistentWorld | null = null;
    private readonly chunksToSave = new Set<Chunk>;
    private readonly loadingChunks = new Map<number, Promise<Chunk>>;

    public setPersistentWorld(persistentWorld: PersistentWorld) {
        this.persistentWorld = persistentWorld;
    }

    public setTerrainGenerator(terrainGenerator: TerrainGenerator) {
        this.terrainGenerator = terrainGenerator;
    }

    public async loadWorld() {
        if(this.persistentWorld == null) {
            throw new ReferenceError("No PersistentWorld container present");
        }

        await this.persistentWorld.init();
        
        const meta = await this.persistentWorld.loadMeta();
        if(meta == null) {
            await this.saveWorld();
            return;
        }
        
        this.seed = meta.seed;
    }

    public async saveWorld() {
        if(this.persistentWorld == null) {
            throw new ReferenceError("No PersistentWorld container present");
        }

        console.log("Saving the world...");
        await this.persistentWorld.saveChunks(this.chunksToSave);
        this.chunksToSave.clear();

        this.persistentWorld.saveMeta({
            seed: this.seed
        });
    }
    
    public async loadPlayerSlot(id: string) {
        if(this.persistentWorld == null) {
            throw new ReferenceError("No PersistentWorld container present");
        }

        return this.persistentWorld.loadPlayerSlot(id);
    }

    public async savePlayerSlot(id: string, player: Player) {
        if(this.persistentWorld == null) {
            throw new ReferenceError("No PersistentWorld container present");
        }

        await this.persistentWorld.savePlayerSlot(id, player);
    }

    public unloadChunk(chunk: Chunk) {
        if(this.renderer != null) {
            this.renderer.removeChunk(chunk);
        }

        this.chunks.delete(chunk.key);
        this.chunksToSave.add(chunk);
    }

    public generateColumn(columnX: number, columnY: number, columnZ: number) {
        this.terrainGenerator.generateColumn(this, columnX, columnY, columnZ);
        for(let y = columnY; y < 8; y++) {
            this.getChunk(columnX, y, columnZ);
        }
    }

    public getChunk(chunkX: number, chunkY: number, chunkZ: number) {
        const chunkKey = VoxelGrid.encodeChunkKey(chunkX, chunkY, chunkZ);

        // Check if the chunk is cached in the world
        let chunk = this.chunks.get(chunkKey);
        if(chunk != null) return chunk;

        // Otherwise, try to make a new chunk from existing tiles
        const tileChunk = this.tiles.chunks.get(chunkKey);
        if(tileChunk != null) {
            chunk = new Chunk(chunkX, chunkY, chunkZ, tileChunk);
            this.chunks.set(chunkKey, chunk);
            return chunk;
        }

        // Otherwise, the chunk data doesn't exist, so return null
        return null;
    }

    public loadChunk(chunkX: number, chunkY: number, chunkZ: number): Promise<Chunk> | null {
        if(this.persistentWorld == null) {
            throw new ReferenceError("No PersistentWorld container present");
        }
        
        if(!this.persistentWorld.hasChunk(chunkX, chunkY, chunkZ)) return null;

        const key = VoxelGrid.encodeChunkKey(chunkX, chunkY, chunkZ);
        let promise = this.loadingChunks.get(key);

        if(promise != null) return promise;

        promise = this.persistentWorld.loadChunk(chunkX, chunkY, chunkZ).then((chunk) => {
            if(chunk == null) throw new Error("Failed to load chunk @ " +
                chunkX + ", " + chunkY + ", " + chunkZ);
            
            const voxelChunk = this.tiles.getChunkOrCreate(chunkX, chunkY, chunkZ);
            voxelChunk.tiles.set(chunk.tiles.tiles);
            (<any>chunk).tiles = voxelChunk;
            this.chunks.set(key, chunk);
            this.loadingChunks.delete(key);

            this.flagChunksForRender(chunkX - 1, chunkY - 1, chunkZ - 1, chunkX + 1, chunkY + 1, chunkZ + 1);

            return chunk;
        })
        this.loadingChunks.set(key, promise);

        return promise;
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
        this.markChunkDirty(x >> 4, y >> 4, z >> 4);

        if(this.renderer === null) return;

        this.flagChunksForRender(
            (x - 1) >> 4, (y - 1) >> 4, (z - 1) >> 4,
            (x + 1) >> 4, (y + 1) >> 4, (z + 1) >> 4,
            true
        );
    }

    public flagChunkForRender(
        chunkX: number, chunkY: number, chunkZ: number,
        priority: boolean = false
    ) {
        if(this.renderer === null) return;

        const chunk = this.getChunk(chunkX, chunkY, chunkZ);
        if(chunk === null) return;

        this.renderer.markDirty(chunk, priority);
    }
    
    public markChunkDirty(
        chunkX: number, chunkY: number, chunkZ: number,
        priority: boolean = false
    ) {
        const chunk = this.getChunk(chunkX, chunkY, chunkZ);
        if(chunk === null) return;

        this.renderer?.markDirty(chunk, priority);
        this.chunksToSave.add(chunk);
    }

    public flagChunksForRender(
        minX: number, minY: number, minZ: number,
        maxX: number, maxY: number, maxZ: number,
        priority: boolean = false
    ) {
        if(this.renderer === null) return;

        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    const chunk = this.getChunk(x, y, z);
                    if(chunk === null) continue;

                    this.renderer.markDirty(chunk, priority);
                }
            }
        }
    }

    public markChunksDirty(
        minX: number, minY: number, minZ: number,
        maxX: number, maxY: number, maxZ: number,
        priority: boolean = false
    ) {
        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    const chunk = this.getChunk(x, y, z);
                    if(chunk === null) continue;

                    this.renderer?.markDirty(chunk, priority);
                    this.chunksToSave.add(chunk);
                }
            }
        }
    }

    public tick(time: Time) {
        for(const tickable of this.tickables) {
            tickable.tick(time);
        }
    }

    public addTickable(tickable: Tickable) {
        this.tickables.add(tickable);
    }
    
    public removeTickable(tickable: Tickable) {
        this.tickables.delete(tickable);
    }
}