export class LightingGrid {
    public readonly chunks = new Map<number, LightingChunk>();

    /** Get a lighting value at global coordinates */
    public get(x: number, y: number, z: number): number {
        const chunkX = x >> 4;
        const chunkY = y >> 4;
        const chunkZ = z >> 4;
        
        const chunk = this.chunks.get(LightingGrid.encodeChunkKey(chunkX, chunkY, chunkZ));
        if(!chunk) return 0;

        const localX = x & 15;
        const localY = y & 15;
        const localZ = z & 15;

        return chunk.get(localX, localY, localZ);
    }

    /** Set a lighting value at global coordinates, creating chunk if needed */
    public set(x: number, y: number, z: number, value: number): void {
        const chunkX = x >> 4;
        const chunkY = y >> 4;
        const chunkZ = z >> 4;

        const key = LightingGrid.encodeChunkKey(chunkX, chunkY, chunkZ);
        let chunk = this.chunks.get(key);
        if(!chunk) {
            chunk = new LightingChunk();
            this.chunks.set(key, chunk);
        }

        const localX = x & 15;
        const localY = y & 15;
        const localZ = z & 15;

        chunk.set(localX, localY, localZ, value);
    }

    /** Get a VoxelChunk by chunk coordinates */
    public getChunk(chunkX: number, chunkY: number, chunkZ: number): LightingChunk | undefined {
        return this.chunks.get(LightingGrid.encodeChunkKey(chunkX, chunkY, chunkZ));
    }

    /** Get a VoxelChunk by chunk coordinates, or create it if it doesn't exist */
    public getChunkOrCreate(chunkX: number, chunkY: number, chunkZ: number): LightingChunk {
        const key = LightingGrid.encodeChunkKey(chunkX, chunkY, chunkZ);

        let chunk = this.chunks.get(key);
        
        if(chunk == null) {
            chunk = new LightingChunk();
            this.chunks.set(key, chunk);
        }

        return chunk;
    }

    /** Encode 3D chunk coordinates into a single number for map key */
    public static encodeChunkKey(x: number, y: number, z: number): number {
        // Using bit-packing: x (high 10 bits) | y (mid 10 bits) | z (low 10 bits)
        // Supports ±512 chunks range
        return ((x & 0x3FF) << 20) | ((y & 0x3FF) << 10) | (z & 0x3FF);
    }
}

export class LightingChunk {
    public readonly nibbles = new Uint8Array(4096);

    public get(x: number, y: number, z: number): number {
        return this.nibbles[x << 8 | y << 4 | z]!;
    }

    public set(x: number, y: number, z: number, nibble: number): void {
        this.nibbles[x << 8 | y << 4 | z] = nibble;
    }
}