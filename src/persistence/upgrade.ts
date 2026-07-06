import type { SerializedChunk } from "./persistentWorld"

type ChunkUpgrade = (chunk: SerializedChunk) => SerializedChunk;

export const CHUNK_SCHEMA_VERSION = 1;
export const chunkUpgrades: ChunkUpgrade[] = [
    // upgrade to 0
    (chunk: SerializedChunk) => {
        // default palette from before update
        chunk.palette = [
            "base:air[default]",
            "base:cobblestone[default]",
            "base:cobblestone[stair]",
            "base:cobblestone[slab]",
            "base:axes[default]",
            "base:dirt[default]",
            "base:grass[default]",
            "base:planks[default]",
            "base:planks[stair]",
            "base:planks[slab]"
        ];
        // convert uint16s to uint8s
        chunk.tiles = new Uint8Array(new Uint16Array(chunk.tiles)).buffer;
        return chunk;
    },
    // upgrade to 1
    (chunk: SerializedChunk) => {
        const lighting = new Uint16Array(4096);
        const tiles = new Uint8Array(4096);
        const palette = chunk.palette;
        for(let i = 0; i < 4096; i++) {
            if(palette[tiles[i]!] === "base:air[default]") {
                lighting[i] = 0xf000; // full sky light, no block light
            }
        }
        chunk.lighting = lighting.buffer;
        return chunk;
    }
]