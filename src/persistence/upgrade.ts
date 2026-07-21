import type { SerializedChunk } from "./persistentWorld";

type ChunkUpgrade = (chunk: SerializedChunk) => SerializedChunk;

export const CHUNK_SCHEMA_VERSION = 3;
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
        (<any>chunk).lighting = lighting.buffer;
        return chunk;
    },
    // upgrade to 2
    (chunk: SerializedChunk) => {
        chunk.blockEntities = [];
        return chunk;
    },
    // upgrade to 3
    (chunk: SerializedChunk) => {
        class LightingChunk {
            public readonly nibbles = new Uint8Array(2048);

            public set(x: number, y: number, z: number, nibble: number): void {
                const index = x | (y << 4) | (z << 8);
                const byteIndex = index >> 1;
                const shift = (index & 1) << 2; // 0 or 4
                const mask = 0x0F << shift;
                this.nibbles[byteIndex] = (this.nibbles[byteIndex]! & ~mask) | ((nibble << shift) & mask);
            }
        }

        const oldLighting = new Uint16Array((<any>chunk).lighting);

        const redValues = new LightingChunk;
        const greenValues = new LightingChunk;
        const blueValues = new LightingChunk;
        const skyValues = new LightingChunk;

        let x = 0, y = 0, z = 0, light = 0;
        for(let i = 0; i < 4096; i++) {
            light = oldLighting[i]!;
            x = i >> 8;
            y = (i >> 4) & 0xf;
            z = i & 0xf;

            redValues.set(x, y, z, light & 0x000f);
            greenValues.set(x, y, z, (light & 0x00f0) >> 4);
            blueValues.set(x, y, z, (light & 0x0f00) >> 8);
            skyValues.set(x, y, z, (light & 0xf000) >> 12);
        }

        chunk.lighting = {
            "base:red": redValues.nibbles.buffer,
            "base:green": greenValues.nibbles.buffer,
            "base:blue": blueValues.nibbles.buffer,
            "base:sky": skyValues.nibbles.buffer
        };
        return chunk;
    }
]