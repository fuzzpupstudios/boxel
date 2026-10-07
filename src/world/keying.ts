export type ChunkKey = bigint | number | string;

/** Encode 3D chunk coordinates into a single ChunkKey for map key */
export function encodeChunkKey(x: number, y: number, z: number): ChunkKey {
    // Using bit-packing: x (high 21 bits) | y (mid 21 bits) | z (low 21 bits)
    // Supports ± 2097151 chunks range
    
    // BigInt conversion is 3x slower than this method with regular numbers,
    // but allows for much farther coordinates
    return ((BigInt(x) & 0x1fffffn) << 42n) | ((BigInt(y) & 0x1fffffn) << 21n) | (BigInt(z) & 0x1fffffn);
}