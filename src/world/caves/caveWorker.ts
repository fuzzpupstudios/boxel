import { FastNoiseNode, preloadFastNoise2Module } from "../../fastnoise/fastnoise2";
import { COLUMN_CHUNK_HEIGHT } from "../terrainGenerator";
import { VoxelGrid } from "../voxelGrid";
import { WormLayer } from "./perlinWorm";


await preloadFastNoise2Module();
const worms = new WormLayer({
    seed: 1,
    minLength: 64,
    maxLength: 128,
    minRadius: 1,
    maxRadius: 3,
    fill: "base:air[default]",
    offsetNoiseScale: 0.05,
    radiusNoiseScale: 0.2,
    verticalSquash: 0.5,
    stepSize: 4,
    count: 4,
    chance: 0.5,
    cacheSize: 32768,
});
const stoneNoise = FastNoiseNode.fromEncodedNodeTree("DQkGDA==");
const stoneNoiseValues = new Float32Array(4096);
const tiles = new VoxelGrid();

function generateChunk(seed: number, chunkX: number, chunkY: number, chunkZ: number): void {
    const chunk = tiles.getChunkOrCreate(chunkX, chunkY, chunkZ);

    stoneNoise.generateUniformGrid3D(
        chunkX << 4, chunkY << 4, chunkZ << 4,
        16, 16, 16,
        1, 1, 1,
        seed,
        stoneNoiseValues
    );

    const limestone = "base:limestone_stone[default]";
    const sedimentary = "base:sedimentary_stone[default]";
    const conglomerate = "base:conglomerate_stone[default]";

    let stoneValue = 0;
    for(let z = 0, i = 0; z < 16; z++) {
        for(let y = 0; y < 16; y++) {
            for(let x = 0; x < 16; x++, i++) {
                stoneValue = stoneNoiseValues[i]!;

                if(stoneValue < -0.33) {
                    chunk.setBlockStateId(x, y, z, limestone);
                } else if(stoneValue > 0.33) {
                    chunk.setBlockStateId(x, y, z, conglomerate);
                } else {
                    chunk.setBlockStateId(x, y, z, sedimentary);
                }
            }
        }
    }
}

function generateColumn(seed: number, columnX: number, columnY: number, columnZ: number) {
    for(let chunkY = columnY + COLUMN_CHUNK_HEIGHT - 1; chunkY >= columnY; chunkY--) {
        generateChunk(seed, columnX, chunkY, columnZ);
    }

    worms.carve(tiles, seed, columnX, columnY, columnZ);
}

addEventListener("message", event => {
    const { data, data: { type } } = event;

    if(type == "generate") {
        generateColumn(data.seed, data.x, data.y, data.z);
        const chunkTiles = [];
        const chunkPalettes = [];

        for(let y = data.y; y < data.y + COLUMN_CHUNK_HEIGHT; y++) {
            const chunk = tiles.getChunk(data.x, y, data.z)!;
            chunkTiles.push(chunk.tiles.buffer);
            chunkPalettes.push(chunk.palette);
        }

        postMessage({
            type: "generate_complete",
            key: data.key,
            tiles: chunkTiles,
            palettes: chunkPalettes,
        /* @ts-expect-error */
        }, chunkTiles);
        
        tiles.chunks.clear();
    }
});
postMessage({ type: "ready" });