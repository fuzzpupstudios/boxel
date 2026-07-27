import { Vector3 } from "three";
import { blockStateRegistry } from "../block/blockRegistry";
import type { BlockEntity } from "../block/entity/blockEntity";
import { Entity, type Tickable } from "../entity/entity";
import { type SerializedPlayerEntity } from "../entity/player";
import type { PersistentWorld } from "../persistence/persistentWorld";
import type { WorldRenderer } from "../rendering/worldRenderer";
import type { Time } from "../time";
import type { LightingChunk } from "./lighting/lightingGrid";
import { LightingManager } from "./lighting/lightingManager";
import { TerrainGenerator } from "./terrainGenerator";
import { VoxelChunk, VoxelGrid } from "./voxelGrid";

export class Chunk {
    public readonly key: number;
    public readonly blockEntities = new Set<BlockEntity>;
    public readonly entities = new Set<Entity>;
    public readonly lightingChunks = new Map<string, LightingChunk>;
    private readonly blockEntityGrid = new Array<BlockEntity>(16 ** 3);
    public world?: World;

    public constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number,
        public readonly tiles: VoxelChunk,
    ) {
        this.key = VoxelGrid.encodeChunkKey(x, y, z);
    }

    public setWorld(world: World) {
        this.world = world;
    }

    public getLightingChunk(lightChannelId: string) {
        let lightingChunk: LightingChunk | undefined = this.lightingChunks.get(lightChannelId);
        if(lightingChunk != null) return lightingChunk;
        if(this.world == null) return null;
        
        lightingChunk = this.world.lightingManager.getChannelOrThrow(lightChannelId)
            .lightingGrid.getChunk(this.x, this.y, this.z);
        if(lightingChunk == null) return null;

        this.lightingChunks.set(lightChannelId, lightingChunk);
        return lightingChunk;
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
    public time: number = 0;
    public persistentWorld: PersistentWorld | null = null;
    public readonly chunksToSave = new Set<Chunk>;
    private readonly chunksWithBlockEntities = new Set<Chunk>;
    public readonly loadingChunks = new Set<number>;
    public readonly lightingManager = new LightingManager(this);

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

    public addEntity(entity: Entity) {
        entity.setWorld(this);
        this.tickables.add(entity);
        this.renderer?.entityRenderer.addEntity(entity);
        entity.updateChunk();
    }

    public removeEntity(entity: Entity) {
        this.tickables.delete(entity);
        this.renderer?.entityRenderer.removeEntity(entity);
        entity.destroy();
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
        this.time = meta.time;
    }

    public async saveWorld() {
        if(this.persistentWorld == null) {
            throw new ReferenceError("No PersistentWorld container present");
        }

        console.log("Saving the world...");
        await this.persistentWorld.saveChunks(this.chunksToSave);
        await this.persistentWorld.saveChunks(this.chunksWithBlockEntities.difference(this.chunksToSave));
        this.chunksToSave.clear();

        this.persistentWorld.saveMeta({
            seed: this.seed,
            time: this.time
        });
    }
    
    public async loadPlayerSlot(id: string) {
        if(this.persistentWorld == null) {
            throw new ReferenceError("No PersistentWorld container present");
        }

        return this.persistentWorld.loadPlayerSlot(id);
    }

    public async savePlayerSlot(player: SerializedPlayerEntity) {
        if(this.persistentWorld == null) {
            throw new ReferenceError("No PersistentWorld container present");
        }

        await this.persistentWorld.savePlayerSlot(player);
    }

    public hideChunk(chunk: Chunk) {
        if(this.renderer != null) {
            this.renderer.removeChunk(chunk);
        }
    }

    public async unloadChunk(chunk: Chunk) {
        this.hideChunk(chunk);

        for(const blockEntity of chunk.blockEntities) {
            this.tickables.delete(blockEntity);
        }

        this.chunks.delete(chunk.key);
        this.chunksWithBlockEntities.delete(chunk);

        if(this.persistentWorld == null) {
            console.warn("No PersistentWorld container present; changes in chunk " + chunk + " were lost");
        } else {
            this.persistentWorld.saveChunk(chunk);
        }
    }

    public generateColumn(columnX: number, columnY: number, columnZ: number) {
        this.terrainGenerator.generateColumn(this, columnX, columnY, columnZ);

        const skyLight = this.lightingManager.getChannelOrThrow("base:sky");

        if(columnY >= 0) {
            const minX = columnX << 4;
            const minZ = columnZ << 4;
            const maxX = (columnX + 1) << 4;
            const maxZ = (columnZ + 1) << 4;
            const maxY = (columnY + 8) << 4;

            for(let x = minX; x < maxX; x++) {
                for(let z = minZ; z < maxZ; z++) {
                    skyLight.set(x, maxY - 1, z, 15);
                }
            }
        }
        
        for(let y = columnY + 7; y >= columnY; y--) {
            this.getChunk(columnX, y, columnZ)?.tiles.update();
            this.lightingManager.updateChunk(columnX, y, columnZ, false);
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
            chunk.setWorld(this);
            this.chunks.set(chunkKey, chunk);
            return chunk;
        }

        // Otherwise, the chunk data doesn't exist, so return null
        return null;
    }

    public async loadChunks(chunkPositions: [number, number, number][]) {
        if(this.persistentWorld == null) {
            throw new ReferenceError("No PersistentWorld container present");
        }

        for(const [ x, y, z ] of chunkPositions) {
            if(!this.persistentWorld.hasChunk(x, y, z)) continue;

            this.loadingChunks.add(VoxelGrid.encodeChunkKey(x, y, z));
        }
        
        const chunks = await this.persistentWorld.loadChunks(chunkPositions);

        for(let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]!;

            const chunkKey = chunk.key;
            
            this.loadingChunks.delete(chunkKey);
            this.tiles.chunks.set(chunkKey, chunk.tiles);

            for(const [ lightChannelId, lightingChunk ] of chunk.lightingChunks.entries()) {
                const lightingChannel = this.lightingManager.getChannel(lightChannelId);
                if(lightingChannel == null) {
                    console.warn("Cannot find lighting channel " + lightChannelId);
                    continue;
                }
                lightingChannel.lightingGrid.chunks.set(chunkKey, lightingChunk);
            }
            chunk.setWorld(this);
            this.chunks.set(chunkKey, chunk);

            if(chunk.blockEntities.size > 0) {
                this.chunksWithBlockEntities.add(chunk);
            }
            for(const blockEntity of chunk.blockEntities) {
                if(blockEntity.type.tickable) {
                    this.tickables.add(blockEntity);
                }
            }
            for(const entity of chunk.entities) {
                this.addEntity(entity);
            }

            this.flagChunksForInitialRender(chunk.x - 1, chunk.y - 1, chunk.z - 1, chunk.x + 1, chunk.y + 1, chunk.z + 1);
        }

        return chunks;
    }

    public addBlockEntity(blockEntity: BlockEntity) {
        const chunk = this.getChunk(blockEntity.x >> 4, blockEntity.y >> 4, blockEntity.z >> 4);
        if(chunk == null) return;
        
        if(blockEntity.type.tickable) {
            this.tickables.add(blockEntity);
        }
        
        chunk.addBlockEntity(blockEntity);
        this.chunksWithBlockEntities.add(chunk);
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

        if(chunk.blockEntities.size === 0) {
            this.chunksWithBlockEntities.delete(chunk);
        }
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

    public getBlockState(x: number, y: number, z: number): string {
        return this.tiles.getBlockStateId(x, y, z);
    }

    public setBlockState(x: number, y: number, z: number, blockStateId: string, markDirty = true) {
        this.tiles.setBlockStateId(x, y, z, blockStateId);
        this.updateBlockEntity(x, y, z);

        if(!markDirty) return;
        this.markChunkDirty(x >> 4, y >> 4, z >> 4);
        this.lightingManager.updateLight(x, y, z, true);

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

    public flagChunksForInitialRender(
        minX: number, minY: number, minZ: number,
        maxX: number, maxY: number, maxZ: number
    ) {
        if(this.renderer === null) return;

        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    const chunk = this.getChunk(x, y, z);
                    if(chunk === null) continue;
                    if(this.renderer.renderedChunks.has(chunk)) continue;

                    this.renderer.markDirty(chunk);
                }
            }
        }
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
        this.time += time.deltaTime / 2400;

        for(const tickable of this.tickables) {
            tickable.tick(time);
            
            if(tickable instanceof Entity) {
                if(tickable.chunk != null) this.chunksToSave.add(tickable.chunk);
            }
        }
    }

    public addTickable(tickable: Tickable) {
        this.tickables.add(tickable);
    }
    
    public removeTickable(tickable: Tickable) {
        this.tickables.delete(tickable);
    }
}