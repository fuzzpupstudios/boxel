import { FastNoiseNode, preloadFastNoise2Module } from "../../fastnoise/fastnoise2";
import { ThreadReceiver } from "../../multithreading/receiver";
import { COLUMN_CHUNK_HEIGHT } from "../terrainGenerator";
import { VoxelGrid } from "../voxelGrid";
import { WormLayer } from "./perlinWorm";

const receiver = new ThreadReceiver;

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

receiver.setHandler("generate", ({ seed, x, y, z }) => {
    generateColumn(seed, x, y, z);
    const chunkTiles = [];
    const chunkPalettes = [];

    for(let dy = 0; dy < COLUMN_CHUNK_HEIGHT; dy++) {
        const chunk = tiles.getChunk(x, y + dy, z)!;
        chunkTiles.push(chunk.tiles.buffer);
        chunkPalettes.push(chunk.palette);
    }

    receiver.send({
        type: "generate",
        tiles: chunkTiles,
        palettes: chunkPalettes
    }, chunkTiles);
    
    tiles.chunks.clear();
});

receiver.ready();