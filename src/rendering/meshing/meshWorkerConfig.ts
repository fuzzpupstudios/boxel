import type { SerializedTileMeshCache } from "./tileRendering";

export interface MesherWorkerConfig {
    meshCache: SerializedTileMeshCache;
    tileCache: TileCacheData;
    geometryData: ChunkGeometryData;
}

export interface ChunkGeometryData {
    readonly positions: Float32Array;
    readonly uvs: Float32Array;
    readonly normals: Float32Array;
    readonly aoFactors: Float32Array;
    readonly lightFactors: Uint8Array[];
    readonly faceTypes: Uint16Array;
    readonly indices: Uint32Array;
}

export function createChunkGeometryData(vertexCount: number, lightChannelCount: number): ChunkGeometryData {
    const positions = SharedFloat32Array(vertexCount * 3);
    const uvs = SharedFloat32Array(vertexCount * 2);
    const normals = SharedFloat32Array(vertexCount * 3);
    const aoFactors = SharedFloat32Array(vertexCount);
    const faceTypes = SharedUint16Array(vertexCount);
    const indices = SharedUint32Array(vertexCount * (6 / 4));

    const lightFactors = new Array;
    for(let i = 0; i < lightChannelCount; i++) {
        lightFactors.push(SharedUint8Array(vertexCount));
    }

    return {
        positions,
        uvs,
        normals,
        aoFactors,
        lightFactors,
        faceTypes,
        indices,
    }
}

export interface TileCacheData {
    readonly lightChannelCount: number;
    readonly meshes: Uint32Array;
    readonly haloAo: Float32Array;
    readonly chunkMeshPalette: Uint32Array;
    readonly lighting: Uint8Array;
}

export function createTileCacheData(lightChannelCount: number): TileCacheData {
    const meshes = SharedUint32Array(18 ** 3);
    const haloAo = SharedFloat32Array(18 ** 3);
    const chunkMeshPalette = SharedUint32Array(256);
    const lighting = SharedUint8Array(18 ** 3 * lightChannelCount);

    return {
        lightChannelCount,
        meshes,
        haloAo,
        chunkMeshPalette,
        lighting,
    }
}

function SharedFloat32Array(length: number) {
    return new Float32Array(new SharedArrayBuffer(length * 4));
}
function SharedUint8Array(length: number) {
    return new Uint8Array(new SharedArrayBuffer(length));
}
function SharedUint16Array(length: number) {
    return new Uint16Array(new SharedArrayBuffer(length * 2));
}
function SharedUint32Array(length: number) {
    return new Uint32Array(new SharedArrayBuffer(length * 4));
}