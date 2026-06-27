import type { World } from "./world";

export abstract class TerrainGenerator {
    public static readonly DEFAULT = new class extends TerrainGenerator {
        public generateColumn(world: World, columnX: number, columnY: number, columnZ: number): void {
            for(let chunkY = columnY; chunkY < columnY + 8; chunkY++) {
                world.tiles.getChunkOrCreate(columnX, chunkY, columnZ);
                world.markChunkDirty(columnX, chunkY, columnZ);
            }
        }
    };

    public abstract generateColumn(world: World, columnX: number, columnY: number, columnZ: number): void;
}