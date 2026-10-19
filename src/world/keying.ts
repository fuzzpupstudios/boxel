export type ChunkKey = bigint & { chunkKey: never };

/** Encode 3D chunk coordinates into a single ChunkKey for map key */
export function encodeChunkKey(x: number, y: number, z: number): ChunkKey {
    // Using bit-packing: x (high 21 bits) | y (mid 21 bits) | z (low 21 bits)
    // Supports ± 2097151 chunks range
    
    // BigInt conversion is 3x slower than this method with regular numbers,
    // but allows for much farther coordinates
    return <any>( ( ( BigInt(x) & 0x1fffffn ) << 42n ) | ( ( BigInt(y) & 0x1fffffn ) << 21n ) | ( BigInt(z) & 0x1fffffn ) );
}

export function translateChunkKey(key: ChunkKey, dx: bigint, dy: bigint, dz: bigint): ChunkKey {
    // Each axis is an independent 21-bit field, so translate and wrap them separately
    const x = ( ( key >> 42n ) + dx ) & 0x1fffffn;
    const y = ( ( key >> 21n ) + dy ) & 0x1fffffn;
    const z = ( key + dz ) & 0x1fffffn;

    return <ChunkKey>( ( x << 42n ) | ( y << 21n ) | z );
}