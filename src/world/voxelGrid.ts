export class VoxelGrid {
    private static readonly CHUNK_SIZE_LOG2 = 4;
    private static readonly CHUNK_SIZE = 1 << VoxelGrid.CHUNK_SIZE_LOG2;
    private static readonly CHUNK_MASK = VoxelGrid.CHUNK_SIZE - 1;

    private chunks = new Map<number, VoxelChunk>();

    /** Get a tile value at global coordinates */
    public getTile(x: number, y: number, z: number): number {
        const chunkX = x >> VoxelGrid.CHUNK_SIZE_LOG2;
        const chunkY = y >> VoxelGrid.CHUNK_SIZE_LOG2;
        const chunkZ = z >> VoxelGrid.CHUNK_SIZE_LOG2;
        
        const chunk = this.chunks.get(this.encodeChunkKey(chunkX, chunkY, chunkZ));
        if (!chunk) return 0;

        const localX = x & VoxelGrid.CHUNK_MASK;
        const localY = y & VoxelGrid.CHUNK_MASK;
        const localZ = z & VoxelGrid.CHUNK_MASK;

        return chunk.get(localX, localY, localZ);
    }

    /** Set a tile value at global coordinates, creating chunk if needed */
    public setTile(x: number, y: number, z: number, value: number): void {
        const chunkX = x >> VoxelGrid.CHUNK_SIZE_LOG2;
        const chunkY = y >> VoxelGrid.CHUNK_SIZE_LOG2;
        const chunkZ = z >> VoxelGrid.CHUNK_SIZE_LOG2;

        const key = this.encodeChunkKey(chunkX, chunkY, chunkZ);
        let chunk = this.chunks.get(key);
        if (!chunk) {
            chunk = new VoxelChunk();
            this.chunks.set(key, chunk);
        }

        const localX = x & VoxelGrid.CHUNK_MASK;
        const localY = y & VoxelGrid.CHUNK_MASK;
        const localZ = z & VoxelGrid.CHUNK_MASK;

        chunk.set(localX, localY, localZ, value);
    }

    /** Get a VoxelChunk by chunk coordinates */
    public getChunk(chunkX: number, chunkY: number, chunkZ: number): VoxelChunk | undefined {
        return this.chunks.get(this.encodeChunkKey(chunkX, chunkY, chunkZ));
    }

    /** Encode 3D chunk coordinates into a single number for map key */
    private encodeChunkKey(x: number, y: number, z: number): number {
        // Using bit-packing: x (high 10 bits) | y (mid 10 bits) | z (low 10 bits)
        // Supports ±512 chunks range
        return ((x & 0x3FF) << 20) | ((y & 0x3FF) << 10) | (z & 0x3FF);
    }
}

export class VoxelChunk {
    public readonly tiles = new Uint16Array(4096);

    public get(x: number, y: number, z: number): number {
        return this.tiles[x << 8 | y << 4 | z]!;
    }
    public set(x: number, y: number, z: number, value: number) {
        this.tiles[x << 8 | y << 4 | z] = value;
    }
}