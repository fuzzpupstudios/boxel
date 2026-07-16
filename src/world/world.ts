import { Vector3 } from "three";
import { blockStateRegistry } from "../block/blockRegistry";
import type { BlockEntity } from "../block/entity/blockEntity";
import { type Tickable } from "../entity/entity";
import type { Player } from "../entity/player";
import type { PersistentWorld } from "../persistence/persistentWorld";
import type { WorldRenderer } from "../rendering/worldRenderer";
import type { Time } from "../time";
import type { LightingChunk } from "./lighting/lightingGrid";
import { LightingEngine } from "./lightingEngine";
import { TerrainGenerator } from "./terrainGenerator";
import { VoxelChunk, VoxelGrid } from "./voxelGrid";

export class Chunk {
    public readonly key: number;
    public readonly blockEntities = new Set<BlockEntity>;
    private readonly blockEntityGrid = new Array<BlockEntity>(16 ** 3);

    public constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number,
        public readonly tiles: VoxelChunk,
        public readonly lighting: LightingChunk,
    ) {
        this.key = VoxelGrid.encodeChunkKey(x, y, z);
    }

    public toString() {
        return `{Chunk x=${this.x} y=${this.y} z=${this.z}}`;
    }

    public addBlockEntity(blockEntity: BlockEntity) {
        const index = (blockEntity.x & 0xf) << 8 | (blockEntity.y & 0xf) << 4 | (blockEntity.z & 0xf);
        this.blockEntityGrid[index] = blockEntity;
        this.blockEntities.add(blockEntity);
    }

    public removeBlockEntity(x: number, y: number, z: number) {
        const index = x << 8 | y << 4 | z;
        const blockEntity = this.blockEntityGrid[index];
        if(blockEntity == null) return;

        delete this.blockEntityGrid[index];
        this.blockEntities.delete(blockEntity);
    }

    public getBlockEntity(x: number, y: number, z: number): BlockEntity | null {
        return this.blockEntityGrid[x << 8 | y << 4 | z] ?? null;
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
    public readonly lighting = new LightingEngine(this);

    public setPersistentWorld(persistentWorld: PersistentWorld) {
        persistentWorld.setWorld(this);
        
        this.persistentWorld = persistentWorld;
    }

    public setTerrainGenerator(terrainGenerator: TerrainGenerator) {
        this.terrainGenerator = terrainGenerator;
    }

    public setRenderer(renderer: WorldRenderer) {
        this.renderer = renderer;
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

        for(const blockEntity of chunk.blockEntities) {
            this.tickables.delete(blockEntity);
        }

        this.chunks.delete(chunk.key);
        this.chunksToSave.add(chunk);
    }

    public generateColumn(columnX: number, columnY: number, columnZ: number) {
        this.terrainGenerator.generateColumn(this, columnX, columnY, columnZ);

        if(columnY >= 0) {
            const minX = columnX << 4;
            const minZ = columnZ << 4;
            const maxX = (columnX + 1) << 4;
            const maxZ = (columnZ + 1) << 4;
            const maxY = (columnY + 8) << 4;

            for(let x = minX; x < maxX; x++) {
                for(let z = minZ; z < maxZ; z++) {
                    this.lighting.sun.set(x, maxY - 1, z, 15);
                }
            }
        }
        
        for(let y = columnY + 7; y >= columnY; y--) {
            this.getChunk(columnX, y, columnZ);
            this.lighting.updateChunk(columnX, y, columnZ, false);
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
            const lightingChunk = this.lighting.values.getChunkOrCreate(chunkX, chunkY, chunkZ);
            chunk = new Chunk(chunkX, chunkY, chunkZ, tileChunk, lightingChunk);
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
            
            this.tiles.chunks.set(VoxelGrid.encodeChunkKey(chunkX, chunkY, chunkZ), chunk.tiles);
            this.lighting.values.chunks.set(VoxelGrid.encodeChunkKey(chunkX, chunkY, chunkZ), chunk.lighting);
            this.chunks.set(key, chunk);
            this.loadingChunks.delete(key);

            for(const blockEntity of chunk.blockEntities) {
                if(blockEntity.type.tickable) {
                    this.tickables.add(blockEntity);
                }
            }

            this.flagChunksForRender(chunkX - 1, chunkY - 1, chunkZ - 1, chunkX + 1, chunkY + 1, chunkZ + 1);

            return chunk;
        })
        this.loadingChunks.set(key, promise);

        return promise;
    }

    public addBlockEntity(blockEntity: BlockEntity) {
        const chunk = this.getChunk(blockEntity.x >> 4, blockEntity.y >> 4, blockEntity.z >> 4);
        if(chunk == null) return;
        
        if(blockEntity.type.tickable) {
            this.tickables.add(blockEntity);
        }
        
        chunk.addBlockEntity(blockEntity);
    }

    public getBlockState(x: number, y: number, z: number): string {
        return this.tiles.getBlockStateId(x, y, z);
    }

    public getBlockEntity(x: number, y: number, z: number): BlockEntity | null {
        const chunk = this.getChunk(x >> 4, y >> 4, z >> 4);
        if(chunk == null) return null;

        const blockEntity = chunk.getBlockEntity(x & 0xf, y & 0xf, z & 0xf);
        return blockEntity;
    }

    public removeBlockEntity(blockEntity: BlockEntity) {
        if(this.tickables.delete(blockEntity)) {
            blockEntity.deinit();
        }

        const chunk = this.getChunk(blockEntity.x >> 4, blockEntity.y >> 4, blockEntity.z >> 4);
        if(chunk == null) return;

        chunk.removeBlockEntity(blockEntity.x & 0xf, blockEntity.y & 0xf, blockEntity.z & 0xf);
    }

    public removeBlockEntityAtPos(x: number, y: number, z: number) {
        const blockEntity = this.getBlockEntity(x, y, z);
        if(blockEntity == null) return;

        this.removeBlockEntity(blockEntity);
    }

    public updateBlockEntity(x: number, y: number, z: number) {
        const currrentBlockId = this.tiles.getBlockStateId(x, y, z);
        const currentBlockState = blockStateRegistry.get(currrentBlockId);
        
        const blockEntity = this.getBlockEntity(x, y, z);
        if(currentBlockState == null && blockEntity != null) {
            this.removeBlockEntity(blockEntity);
            return;
        }

        if(currentBlockState != null) {
            const currentBlockEntityType = currentBlockState.block.blockEntity;

            if(currentBlockEntityType == null) {
                if(blockEntity != null) {
                    this.removeBlockEntity(blockEntity);
                }
            } else {
                if(blockEntity != null) {
                    blockEntity.updateBlockState(currentBlockState);
                } else {
                    const blockEntity = currentBlockEntityType.create(this, x, y, z);
                    blockEntity.init();
                    this.addBlockEntity(blockEntity);
                }
            }
        }
    }

    public setBlockState(x: number, y: number, z: number, blockStateId: string, markDirty = true) {
        this.tiles.setBlockStateId(x, y, z, blockStateId);
        this.updateBlockEntity(x, y, z);

        if(!markDirty) return;
        this.markChunkDirty(x >> 4, y >> 4, z >> 4);
        this.lighting.updateLight(x, y, z, true);

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