import type { World } from "./world";

export const COLUMN_CHUNK_HEIGHT = 8;

export abstract class TerrainGenerator {
    public static readonly DEFAULT = new class extends TerrainGenerator {
        public async generateColumn(world: World, columnX: number, columnY: number, columnZ: number) {
            for(let chunkY = columnY; chunkY < columnY + COLUMN_CHUNK_HEIGHT; chunkY++) {
                world.tiles.getChunkOrCreate(columnX, chunkY, columnZ);
            }
        }
    };

    public async init() {

    }

    public dispose() {

    }

    public abstract generateColumn(world: World, columnX: number, columnY: number, columnZ: number): Promise<void>;
}