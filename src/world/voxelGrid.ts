import { encodeChunkKey, type ChunkKey } from "./keying";

export class VoxelGrid {
    private static readonly CHUNK_SIZE_LOG2 = 4;
    private static readonly CHUNK_SIZE = 1 << VoxelGrid.CHUNK_SIZE_LOG2;
    private static readonly CHUNK_MASK = VoxelGrid.CHUNK_SIZE - 1;

    public readonly chunks = new Map<ChunkKey, VoxelChunk>();
    public defaultBlockState = "base:air[default]";

    /** Get a tile value at global coordinates */
    public getBlockStateId(x: number, y: number, z: number): string {
        const chunkX = x >> VoxelGrid.CHUNK_SIZE_LOG2;
        const chunkY = y >> VoxelGrid.CHUNK_SIZE_LOG2;
        const chunkZ = z >> VoxelGrid.CHUNK_SIZE_LOG2;
        
        const chunk = this.chunks.get(encodeChunkKey(chunkX, chunkY, chunkZ));
        if(!chunk) return "";

        const localX = x & VoxelGrid.CHUNK_MASK;
        const localY = y & VoxelGrid.CHUNK_MASK;
        const localZ = z & VoxelGrid.CHUNK_MASK;

        return chunk.getBlockStateId(localX, localY, localZ);
    }

    /** Set a tile value at global coordinates, creating chunk if needed */
    public setBlockStateId(x: number, y: number, z: number, value: string): void {
        const chunkX = x >> VoxelGrid.CHUNK_SIZE_LOG2;
        const chunkY = y >> VoxelGrid.CHUNK_SIZE_LOG2;
        const chunkZ = z >> VoxelGrid.CHUNK_SIZE_LOG2;

        const key = encodeChunkKey(chunkX, chunkY, chunkZ);
        let chunk = this.chunks.get(key);
        if(!chunk) {
            chunk = VoxelChunk.fromNew();
            chunk.getPaletteValue(this.defaultBlockState);
            this.chunks.set(key, chunk);
        }

        const localX = x & VoxelGrid.CHUNK_MASK;
        const localY = y & VoxelGrid.CHUNK_MASK;
        const localZ = z & VoxelGrid.CHUNK_MASK;

        chunk.setBlockStateId(localX, localY, localZ, value);
    }

    /** Get a VoxelChunk by chunk coordinates */
    public getChunk(chunkX: number, chunkY: number, chunkZ: number): VoxelChunk | undefined {
        return this.chunks.get(encodeChunkKey(chunkX, chunkY, chunkZ));
    }

    /** Get a VoxelChunk by chunk coordinates, or create it if it doesn't exist */
    public getChunkOrCreate(chunkX: number, chunkY: number, chunkZ: number): VoxelChunk {
        const key = encodeChunkKey(chunkX, chunkY, chunkZ);

        let chunk = this.chunks.get(key);
        
        if(chunk == null) {
            chunk = VoxelChunk.fromNew();
            chunk.getPaletteValue(this.defaultBlockState);
            this.chunks.set(key, chunk);
        }

        return chunk;
    }
}

export class VoxelChunk {
    public static fromData(tiles: Uint8Array<ArrayBuffer>, palette: string[]) {
        const paletteMap = new Map<string, number>;
        for(let i = 0; i < palette.length; i++) paletteMap.set(palette[i]!, i);

        return new VoxelChunk(
            tiles,
            palette,
            paletteMap,
            palette.length == 1
        );
    }
    public static fromNew() {
        return new VoxelChunk(
            new Uint8Array(4096),
            new Array,
            new Map,
            true
        );
    }

    private constructor(
        public readonly tiles: Uint8Array<ArrayBuffer>,
        public readonly palette: Array<string>,
        public readonly paletteMap: Map<string, number>,
        public entireSingleTile: boolean
    ) {}
    
    public getPaletteValue(item: string): number {
        const paletteItem = this.paletteMap.get(item);
        if(paletteItem != null) return paletteItem;

        this.entireSingleTile = false;

        this.paletteMap.set(item, this.palette.length);
        this.palette.push(item);

        return this.palette.length - 1;
    }

    public update() {
        if(this.entireSingleTile) {
            const first = this.tiles[0]!;
            for(let i = 0; i < this.tiles.length; i++) {
                if(this.tiles[i] != first) {
                    this.entireSingleTile = false;
                    break;
                }
            }

            if(this.entireSingleTile) {
                const singleBlockStateId = this.palette[first]!;
                this.palette.splice(0);
                this.palette.push(singleBlockStateId);
                this.paletteMap.clear();
                this.paletteMap.set(singleBlockStateId, 0);
                this.tiles.fill(0);
            }
        }
    }

    public getBlockStateId(x: number, y: number, z: number): string {
        return this.palette[this.tiles[x << 8 | y << 4 | z]!]!;
    }
    public getTile(x: number, y: number, z: number) {
        return this.tiles[x << 8 | y << 4 | z]!;
    }
    public setBlockStateId(x: number, y: number, z: number, blockStateId: string) {
        this.tiles[x << 8 | y << 4 | z] = this.getPaletteValue(blockStateId);
    }
    public setTile(x: number, y: number, z: number, value: number) {
        this.tiles[x << 8 | y << 4 | z] = value;
    }
    public fill(id: string) {
        this.tiles.fill(0);
        this.paletteMap.clear();
        this.paletteMap.set(id, 0);

        if(this.entireSingleTile) {
            this.palette[0] = id;
        } else {
            this.entireSingleTile = true;
            this.palette.splice(0, this.palette.length, id);
        }
    }
}