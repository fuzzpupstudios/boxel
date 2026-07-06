export class LightingGrid {
    private static readonly CHUNK_SIZE_LOG2 = 4;
    private static readonly CHUNK_SIZE = 1 << LightingGrid.CHUNK_SIZE_LOG2;
    private static readonly CHUNK_MASK = LightingGrid.CHUNK_SIZE - 1;

    public readonly chunks = new Map<number, LightingChunk>();

    /** Get a lighting value at global coordinates */
    public get(x: number, y: number, z: number, offset: number): number {
        const chunkX = x >> LightingGrid.CHUNK_SIZE_LOG2;
        const chunkY = y >> LightingGrid.CHUNK_SIZE_LOG2;
        const chunkZ = z >> LightingGrid.CHUNK_SIZE_LOG2;
        
        const chunk = this.chunks.get(LightingGrid.encodeChunkKey(chunkX, chunkY, chunkZ));
        if(!chunk) return 0;

        const localX = x & LightingGrid.CHUNK_MASK;
        const localY = y & LightingGrid.CHUNK_MASK;
        const localZ = z & LightingGrid.CHUNK_MASK;

        return chunk.get(localX, localY, localZ, offset);
    }

    /** Get a raw lighting value at global coordinates */
    public getRaw(x: number, y: number, z: number): number {
        const chunkX = x >> LightingGrid.CHUNK_SIZE_LOG2;
        const chunkY = y >> LightingGrid.CHUNK_SIZE_LOG2;
        const chunkZ = z >> LightingGrid.CHUNK_SIZE_LOG2;
        
        const chunk = this.chunks.get(LightingGrid.encodeChunkKey(chunkX, chunkY, chunkZ));
        if(!chunk) return 0;

        const localX = x & LightingGrid.CHUNK_MASK;
        const localY = y & LightingGrid.CHUNK_MASK;
        const localZ = z & LightingGrid.CHUNK_MASK;

        return chunk.getRaw(localX, localY, localZ);
    }

    /** Set a lighting value at global coordinates, creating chunk if needed */
    public set(x: number, y: number, z: number, value: number, offset: number): void {
        const chunkX = x >> LightingGrid.CHUNK_SIZE_LOG2;
        const chunkY = y >> LightingGrid.CHUNK_SIZE_LOG2;
        const chunkZ = z >> LightingGrid.CHUNK_SIZE_LOG2;

        const key = LightingGrid.encodeChunkKey(chunkX, chunkY, chunkZ);
        let chunk = this.chunks.get(key);
        if(!chunk) {
            chunk = new LightingChunk();
            this.chunks.set(key, chunk);
        }

        const localX = x & LightingGrid.CHUNK_MASK;
        const localY = y & LightingGrid.CHUNK_MASK;
        const localZ = z & LightingGrid.CHUNK_MASK;

        chunk.set(localX, localY, localZ, offset, value);
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
    public readonly values = new Uint16Array(4096);

    public get(x: number, y: number, z: number, offset: number) {
        return this.values[x << 8 | y << 4 | z]! >> offset & 0xf;
    }
    public getRaw(x: number, y: number, z: number) {
        return this.values[x << 8 | y << 4 | z]!;
    }
    public set(x: number, y: number, z: number, offset: number, value: number) {
        const index = x << 8 | y << 4 | z;
        const mask = 0xf << offset;
        const clampedValue = value & 0xf;

        this.values[index] = this.values[index]! & ~mask | clampedValue << offset;
    }
}