import { encodeChunkKey, type ChunkKey } from "../keying";
import { COLUMN_CHUNK_HEIGHT, TerrainGenerator } from "../terrainGenerator";
import { VoxelChunk } from "../voxelGrid";
import { Chunk, World } from "../world";

interface GenerationMessage {
    type: "generate_complete",
    key: ChunkKey,
    tiles: Uint8Array<ArrayBuffer>[],
    palettes: string[][]
}

export class CaveTerrainGenerator extends TerrainGenerator {
    private workers = new Array<Worker>;
    private generationQueue = new Map<ChunkKey, (message: GenerationMessage) => void>;

    public override async init() {
        for(let i = 0; i < 4; i++) {
            await new Promise<void>((res, rej) => {
                const worker = new Worker(new URL("./caveWorker.ts", import.meta.url), { type: "module" });

                worker.addEventListener("message", event => {
                    const type = event.data.type;

                    if(type == "generate_complete") {
                        this.generationQueue.get(event.data.key)?.(event.data);
                    }
                    if(type == "ready") {
                        res();
                    }
                });

                this.workers.push(worker);
            });
        }
    }

    private dispatchGenerate(seed: number, x: number, y: number, z: number, callback: (message: GenerationMessage) => void) {
        const key = encodeChunkKey(x, y, z);

        const workerId = (x >> 6 & 1) | ((z >> 6 & 1) << 1);
        const worker = this.workers[workerId]!;
        worker.postMessage({ type: "generate", seed, x, y, z, key });

        this.generationQueue.set(key, callback);
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

                        console.log(distanceSquared);
                        console.log(x + chunkBlockX, y + chunkBlockY, z + chunkBlockZ, fill);
                        chunk.tiles.setBlockStateId(x, y, z, fill);
                    }
                }
            }
        }

        if(chunk.x == 0 && chunk.y == -1 && chunk.z == 0) {
            chunk.tiles.setBlockStateId(0, 15, 0, "base:lamp[color=white]");
        }
    }

    public override generateColumn(world: World, columnX: number, columnY: number, columnZ: number, callback: () => void) {
        this.dispatchGenerate(world.seed, columnX, columnY, columnZ, message => {
            for(let i = 0; i < COLUMN_CHUNK_HEIGHT; i++) {
                const key = encodeChunkKey(columnX, columnY + i, columnZ);

                const chunk = VoxelChunk.fromData(new Uint8Array(message.tiles[i]!), message.palettes[i]!);
                world.tiles.chunks.set(key, chunk);
                this.processAfter(world.getChunk(columnX, columnY + i, columnZ)!);
            }
            
            callback();
        });
    }
}
