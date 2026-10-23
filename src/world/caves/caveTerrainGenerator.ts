import { ThreadDispatcher } from "../../multithreading/dispatcher";
import { encodeChunkKey, type ChunkKey } from "../keying";
import { COLUMN_CHUNK_HEIGHT, TerrainGenerator } from "../terrainGenerator";
import { VoxelChunk } from "../voxelGrid";
import { Chunk, World } from "../world";

const workerURL = new URL("./caveWorker.ts", import.meta.url);

export class CaveTerrainGenerator extends TerrainGenerator {    
    private readonly threadDispatcher = new ThreadDispatcher(workerURL);

    public override async init() {
        for(let i = 0; i < 4; i++) {
            this.threadDispatcher.createWorker({});
        }
    }

    private processAfter(chunk: Chunk) {
        if(chunk.x > -2 && chunk.x < 1 && chunk.y > -2 && chunk.y < 1 && chunk.z > -2 && chunk.z < 1) {
            this.placeStartingPlatform(chunk);
        }
    }

    private placeStartingPlatform(chunk: Chunk) {
        const radius = 3;
        const fill = "base:air[default]";

        const chunkBlockX = chunk.x << 4;
        const chunkBlockY = chunk.y << 4;
        const chunkBlockZ = chunk.z << 4;
        
        const centerX = 0;
        const centerY = radius - 0.5;
        const centerZ = 0;
        const radiusSquared = radius * radius;

        if(chunk.y == 0) {
            for(let x = 0; x < 16; x++) {
                const dx2 = (x + chunkBlockX - centerX) * (x + chunkBlockX - centerX);

                for(let y = 0; y < 16; y++) {
                    const dy2 = (y + chunkBlockY - centerY) * (y + chunkBlockY - centerY);

                    for(let z = 0; z < 16; z++) {
                        const distanceSquared = dx2 + dy2 + (z + chunkBlockZ - centerZ) * (z + chunkBlockZ - centerZ);

                        if(distanceSquared > radiusSquared) continue;
                        chunk.tiles.setBlockStateId(x, y, z, fill);
                    }
                }
            }
        }

        if(chunk.x == 0 && chunk.y == -1 && chunk.z == 0) {
            chunk.tiles.setBlockStateId(0, 15, 0, "base:lamp[color=white]");
        }
    }

    public override async generateColumn(world: World, columnX: number, columnY: number, columnZ: number) {
        const worker = await this.threadDispatcher.getWorker();

        try {
            worker.send({
                type: "generate",
                seed: world.seed,
                x: columnX,
                y: columnY,
                z: columnZ
            });
            const message = await worker.once("generate");

            for(let i = 0; i < COLUMN_CHUNK_HEIGHT; i++) {
                const key = encodeChunkKey(columnX, columnY + i, columnZ);

                const tileChunk = VoxelChunk.fromData(new Uint8Array(message.tiles[i]!), message.palettes[i]!);
                world.tiles.chunks.set(key, tileChunk);
                const chunk = world.createChunk(columnX, columnY + i, columnZ)!;
                this.processAfter(chunk);
            }
        } finally {
            this.threadDispatcher.returnWorker(worker);
        }
    }
}
