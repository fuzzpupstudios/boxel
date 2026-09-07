import { TerrainGenerator } from "./terrainGenerator";
import type { World } from "./world";

export class BoxelTerrainGenerator extends TerrainGenerator {
    public generateColumn(world: World, columnX: number, columnY: number, columnZ: number): void {            
        for(let chunkY = columnY + 7; chunkY >= columnY; chunkY--) {
            this.generate(world, columnX, chunkY, columnZ);
        }

        world.markChunksDirty(columnX - 1, columnY - 1, columnZ - 1, columnX + 1, columnY + 9, columnZ + 1);
    }
    
    public generate(world: World, chunkX: number, chunkY: number, chunkZ: number): void {
        const chunk = world.tiles.getChunkOrCreate(chunkX, chunkY, chunkZ);

        let globalX = chunkX * 16;
        let globalY = chunkY * 16;
        let globalZ = chunkZ * 16;
        
        for(let localZ = 0; localZ < 16; localZ++, globalZ++) {
            for(let localX = 0; localX < 16; localX++, globalX++) {
                for(let localY = 15; localY >= 0; localY--) {
                    let tile = "base:air[default]";

                    const tunnelX = localX >= 7 && localX <= 8 && localY >= 1 && localY <= 3;
                    const tunnelZ = localZ >= 7 && localZ <= 8 && localY >= 1 && localY <= 3;

                    if(!tunnelX && !tunnelZ) {
                        if(localX == 0 || localZ == 0) {
                            tile = "base:wallpaper[type=office]";
                        }
                        if(localY == 0) {
                            tile = "base:carpet[type=office]";
                        }
                        if(localY == 15) {
                            if(localX == 8 && localZ == 8) {
                                tile = "base:ceiling_light[variant=1x1]";
                            } else {
                                tile = "base:ceiling_tile[variant=1x1]";
                            }
                        }
                    }
                    chunk.setBlockStateId(localX, localY, localZ, tile);
                }
                globalY += 16;
            }
            globalX -= 16;
        }
    }
}