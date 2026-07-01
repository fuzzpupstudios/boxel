import { BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute } from "three";
import type { World } from "../world/world";
import { blockStateRegistry, tileRegistry } from "../block/blockRegistry";


export interface TileFace {
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    cull: boolean;
    uvMinX: number;
    uvMaxX: number;
    uvMinY: number;
    uvMaxY: number;
}

export interface TileMesh {
    skipRender: boolean;
    occludeNorth: boolean;
    occludeEast: boolean;
    occludeSouth: boolean;
    occludeWest: boolean;
    occludeUp: boolean;
    occludeDown: boolean;

    north: TileFace[];
    east: TileFace[];
    south: TileFace[];
    west: TileFace[];
    up: TileFace[];
    down: TileFace[];
}

export class ChunkMesher {
    public readonly tileMeshes: TileMesh[];

    public constructor(
        public readonly world: World
    ) {
        this.tileMeshes = new Array;
        for(const blockStateKey of tileRegistry.values()) {
            const blockState = blockStateRegistry.get(blockStateKey)!;
            
            try {
                const compiledModel = blockState.model.compile();
                this.tileMeshes.push(compiledModel);
            } catch(e) {
                throw new Error("Failed to compile block model " + blockState, { cause: e });
            }
        }

        console.log(this.tileMeshes);
    }

    private getMesh(tile: number) {
        return this.tileMeshes[tile]!;
    }

    public mesh(chunkX: number, chunkY: number, chunkZ: number) {
        const tiles = this.world.tiles;

        const minBlockX = chunkX << 4;
        const minBlockY = chunkY << 4;
        const minBlockZ = chunkZ << 4;
        const maxBlockX = (chunkX + 1) << 4;
        const maxBlockY = (chunkY + 1) << 4;
        const maxBlockZ = (chunkZ + 1) << 4;

        // [ pos.x, pos.y, pos.z, uv.x, uv.y, normal.x, normal.y, normal.z ]
        const floatAttributes = new Array;
        const indices = new Array;

        let vertexCount = 0;

        for(let blockX = minBlockX, x = 0; blockX < maxBlockX; blockX++, x++) {
            for(let blockY = minBlockY, y = 0; blockY < maxBlockY; blockY++, y++) {
                for(let blockZ = minBlockZ, z = 0; blockZ < maxBlockZ; blockZ++, z++) {
                    const tile = tiles.getTile(blockX, blockY, blockZ);
                    const mesh = this.getMesh(tile);

                    if(mesh.skipRender) continue;

                    // North
                    const showNorth = !this.getMesh(tiles.getTile(blockX, blockY, blockZ + 1)).occludeWest;
                    for(const face of mesh.north) {
                        if(face.cull && !showNorth) continue;

                        floatAttributes.push(
            /* pos      */  x + face.x, y + face.y, z + face.z,
            /* uv       */  face.uvMinX, face.uvMinY,
            /* normal   */  0, 0, 1,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  0, 0, 1,

            /* pos      */  x + face.x + face.width, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  0, 0, 1,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  0, 0, 1,

                        );
                        indices.push(
                            vertexCount + 0, vertexCount + 3, vertexCount + 2,
                            vertexCount + 2, vertexCount + 1, vertexCount + 0
                        );
                        vertexCount += 4;
                    }

                    // South
                    const showSouth = !this.getMesh(tiles.getTile(blockX, blockY, blockZ - 1)).occludeNorth;
                    for(const face of mesh.south) {
                        if(face.cull && !showSouth) continue;

                        floatAttributes.push(
            /* pos      */  x + face.x, y + face.y, z + face.z,
            /* uv       */  face.uvMinX, face.uvMinY,
            /* normal   */  0, 0, -1,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  0, 0, -1,

            /* pos      */  x + face.x - face.width, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  0, 0, -1,

            /* pos      */  x + face.x - face.width, y + face.y, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  0, 0, -1,

                        );
                        indices.push(
                            vertexCount + 0, vertexCount + 3, vertexCount + 2,
                            vertexCount + 2, vertexCount + 1, vertexCount + 0
                        );
                        vertexCount += 4;
                    }

                    // East
                    const showEast = !this.getMesh(tiles.getTile(blockX + 1, blockY, blockZ)).occludeEast;
                    for(const face of mesh.east) {
                        if(face.cull && !showEast) continue;
                        
                        floatAttributes.push(
            /* pos      */  x + face.x, y + face.y, z + face.z,
            /* uv       */  face.uvMinX, face.uvMinY,
            /* normal   */  1, 0, 0,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  1, 0, 0,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z - face.width,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  1, 0, 0,

            /* pos      */  x + face.x, y + face.y, z + face.z - face.width,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  1, 0, 0,

                        );
                        indices.push(
                            vertexCount + 0, vertexCount + 3, vertexCount + 2,
                            vertexCount + 2, vertexCount + 1, vertexCount + 0
                        );
                        vertexCount += 4;
                    }

                    // West
                    if(!this.getMesh(tiles.getTile(blockX - 1, blockY, blockZ)).occludeWest) {
                        for(const face of mesh.west) {
                            floatAttributes.push(
                /* pos      */  x + face.x, y + face.y, z + face.z,
                /* uv       */  face.uvMinX, face.uvMinY,
                /* normal   */  -1, 0, 0,

                /* pos      */  x + face.x, y + face.y + face.height, z + face.z,
                /* uv       */  face.uvMinX, face.uvMaxY,
                /* normal   */  -1, 0, 0,

                /* pos      */  x + face.x, y + face.y + face.height, z + face.z + face.width,
                /* uv       */  face.uvMaxX, face.uvMaxY,
                /* normal   */  -1, 0, 0,

                /* pos      */  x + face.x, y + face.y, z + face.z + face.width,
                /* uv       */  face.uvMaxX, face.uvMinY,
                /* normal   */  -1, 0, 0,

                            );
                            indices.push(
                                vertexCount + 0, vertexCount + 3, vertexCount + 2,
                                vertexCount + 2, vertexCount + 1, vertexCount + 0
                            );
                            vertexCount += 4;
                        }
                    }

                    // Up
                    const showUp = !this.getMesh(tiles.getTile(blockX, blockY + 1, blockZ)).occludeDown;
                    for(const face of mesh.up) {
                        if(face.cull && !showUp) continue;
                        
                        floatAttributes.push(
            /* pos      */  x + face.x, y + face.y, z + face.z,
            /* uv       */  face.uvMinX, face.uvMinY,
            /* normal   */  0, 1, 0,

            /* pos      */  x + face.x, y + face.y, z + face.z - face.height,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  0, 1, 0,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z - face.height,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  0, 1, 0,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  0, 1, 0,

                        );
                        indices.push(
                            vertexCount + 0, vertexCount + 3, vertexCount + 2,
                            vertexCount + 2, vertexCount + 1, vertexCount + 0
                        );
                        vertexCount += 4;
                    }

                    // Down
                    const showDown = !this.getMesh(tiles.getTile(blockX, blockY - 1, blockZ)).occludeUp;
                    for(const face of mesh.down) {
                        if(face.cull && !showDown) continue;

                        floatAttributes.push(
            /* pos      */  x + face.x, y + face.y, z + face.z,
            /* uv       */  face.uvMinX, face.uvMinY,
            /* normal   */  0, -1, 0,

            /* pos      */  x + face.x, y + face.y, z + face.z + face.height,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  0, -1, 0,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z + face.height,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  0, -1, 0,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  0, -1, 0,

                        );
                        indices.push(
                            vertexCount + 0, vertexCount + 3, vertexCount + 2,
                            vertexCount + 2, vertexCount + 1, vertexCount + 0
                        );
                        vertexCount += 4;
                    }
                }
            }
        }

        const geometry = new BufferGeometry();

        // Copy float data to Float32Array and make it an InterleavedBuffer
        const interleavedFloatAttributes = new InterleavedBuffer(
            new Float32Array(floatAttributes), 8);
        
        // Use interleaved buffer data to set vertex attributes
        geometry.setAttribute("position", new InterleavedBufferAttribute(interleavedFloatAttributes, 3, 0));
        geometry.setAttribute("uv", new InterleavedBufferAttribute(interleavedFloatAttributes, 2, 3));
        geometry.setAttribute("normal", new InterleavedBufferAttribute(interleavedFloatAttributes, 3, 5));

        // Set indices
        geometry.setIndex(indices);

        return geometry;
    }
}