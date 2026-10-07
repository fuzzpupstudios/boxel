import { encodeChunkKey, type ChunkKey } from "../keying";
import { COLUMN_CHUNK_HEIGHT, TerrainGenerator } from "../terrainGenerator";
import { VoxelChunk } from "../voxelGrid";
import { World } from "../world";

interface GenerationMessage {
    type: "generate_complete",
    key: number,
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

    public override generateColumn(world: World, columnX: number, columnY: number, columnZ: number, callback: () => void) {
        this.dispatchGenerate(world.seed, columnX, columnY, columnZ, message => {
            for(let i = 0; i < COLUMN_CHUNK_HEIGHT; i++) {
                const key = encodeChunkKey(columnX, columnY + i, columnZ);

                const chunk = VoxelChunk.fromData(new Uint8Array(message.tiles[i]!), message.palettes[i]!);
                world.tiles.chunks.set(key, chunk);
            }
            
            callback();
        });
    }
}
