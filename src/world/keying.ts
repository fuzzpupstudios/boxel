export type ChunkKey = number | string;

/** Encode 3D chunk coordinates into a single ChunkKey for map key */
export function encodeChunkKey(x: number, y: number, z: number): ChunkKey {
    // Using bit-packing: x (high 11 bits) | y (mid 10 bits) | z (low 11 bits)
    // Supports y ± 512, xz ± 1024 chunks range
    return ((x & 0x7FF) << 21) | ((y & 0x3FF) << 11) | (z & 0x7FF);
}