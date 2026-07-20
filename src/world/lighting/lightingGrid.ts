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
    public readonly nibbles = new Uint8Array(2048);

    public get(x: number, y: number, z: number): number {
        const index = x | (y << 4) | (z << 8);
        const shift = (index & 1) << 2; // 0 or 4
        return (this.nibbles[index >> 1]! >> shift) & 0x0F;
    }

    public set(x: number, y: number, z: number, nibble: number): void {
        const index = x | (y << 4) | (z << 8);
        const byteIndex = index >> 1;
        const shift = (index & 1) << 2; // 0 or 4
        const mask = 0x0F << shift;
        this.nibbles[byteIndex] = (this.nibbles[byteIndex]! & ~mask) | ((nibble << shift) & mask);
    }
}