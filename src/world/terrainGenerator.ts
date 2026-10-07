import type { World } from "./world";

export const COLUMN_CHUNK_HEIGHT = 8;

export abstract class TerrainGenerator {
    public static readonly DEFAULT = new class extends TerrainGenerator {
        public generateColumn(world: World, columnX: number, columnY: number, columnZ: number, callback: () => void) {
            for(let chunkY = columnY; chunkY < columnY + COLUMN_CHUNK_HEIGHT; chunkY++) {
                world.tiles.getChunkOrCreate(columnX, chunkY, columnZ);
                world.markChunkDirty(columnX, chunkY, columnZ);
            }
            callback();
        }
    };

    public async init() {

    }

    public abstract generateColumn(world: World, columnX: number, columnY: number, columnZ: number, callback: () => void): void;
}