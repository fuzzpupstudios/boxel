import { tileRegistry } from "../block/blockRegistry";
import { FastNoiseNode } from "../fastnoise/fastnoise2";
import { TerrainGenerator } from "./terrainGenerator";
import type { World } from "./world";

export class SimpleTerrainGenerator extends TerrainGenerator {
    private readonly air = tileRegistry.findKey("base:air[default]")!;
    private readonly stone = tileRegistry.findKey("base:cobblestone[default]")!;
    private readonly dirt = tileRegistry.findKey("base:dirt[default]")!;
    private readonly grass = tileRegistry.findKey("base:grass[default]")!;
    private readonly heightmap = new Float32Array(16 * 16);
    private readonly cavemap = new Float32Array(16 * 16 * 16);
    private readonly heightmapNoise = FastNoiseNode.fromEncodedNodeTree("DQkGDA==");
    private readonly caveNoise = FastNoiseNode.fromEncodedNodeTree("KQAB@BCRkJDQkGBAuamZm+DAPXo7A/CwrXI70TAACAvwQ=");

    public generateColumn(world: World, columnX: number, columnY: number, columnZ: number): void {
        const heights = this.heightmapNoise.generateUniformGrid2D(
            columnX * 16, columnZ * 16, 16, 16, 1, 1, world.seed, this.heightmap).values;
        
        for(let i = 0; i < heights.length; i++) heights[i]! = heights[i]! * 32 + 64;
            
        for(let chunkY = columnY + 7; chunkY >= columnY; chunkY--) {
            this.generate(world, columnX, chunkY, columnZ, heights);
        }
    }
    
    public generate(world: World, chunkX: number, chunkY: number, chunkZ: number, heights: Float32Array): void {
        const chunk = world.tiles.getChunkOrCreate(chunkX, chunkY, chunkZ);

        let globalX = chunkX * 16;
        let globalY = chunkY * 16;
        let globalZ = chunkZ * 16;
        
        const caves = this.caveNoise.generateUniformGrid3D(
            globalX, globalY, globalZ, 16, 16, 16, 1, 1, 1, world.seed, this.cavemap).values;

        let index2d = 0, index3d = 0;
        for(let localZ = 0; localZ < 16; localZ++, globalZ++) {
            for(let localX = 0; localX < 16; localX++, globalX++, index2d++) {
                let height = heights[index2d]!;

                for(let localY = 15; localY >= 0; localY--, globalY--) {
                    index3d = localX | localY << 4 | localZ << 8;
                    const cave = caves[index3d]!;
                    if(cave > 0.2 && globalY < height && globalY > height - 1) {
                        height--;
                        heights[index2d]! = height;
                    }

                    let tile = 0;

                    if(globalY > height) {
                        tile = this.air;
                    } else if(globalY > height - 1) {
                        tile = this.grass;
                    } else if(globalY > height - 4) {
                        tile = this.dirt;
                    } else {
                        tile = this.stone;
                    }
                    chunk.set(localX, localY, localZ, tile);
                }
                globalY += 16;
            }
            globalX -= 16;
        }

        world.markChunkDirty(chunkX, chunkY, chunkZ);
    }
}