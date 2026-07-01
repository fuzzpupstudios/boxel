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

    aoReceiveWeight: number;
}

export interface TileMesh {
    skipRender: boolean;

    occludeNorth: boolean;
    occludeEast: boolean;
    occludeSouth: boolean;
    occludeWest: boolean;
    occludeUp: boolean;
    occludeDown: boolean;

    aoCastWeight: number;

    north: TileFace[];
    east: TileFace[];
    south: TileFace[];
    west: TileFace[];
    up: TileFace[];
    down: TileFace[];
}

export class ChunkMesher {
    public readonly tileMeshes: TileMesh[];
    private readonly aoWeights: Float32Array;

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

        this.aoWeights = new Float32Array(this.tileMeshes.length);
        for(let i = 0; i < this.tileMeshes.length; i++) {
            this.aoWeights[i] = this.tileMeshes[i]!.aoCastWeight;
        }

        console.log(this.aoWeights);

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

        // [ pos.x, pos.y, pos.z, uv.x, uv.y, normal.x, normal.y, normal.z, aoFactor ]
        const floatAttributes = new Array;
        const indices = new Array;

        let vertexCount = 0;

        let ao$nnn = 0, ao$nn_ = 0, ao$nnp = 0;
        let ao$n_n = 0, ao$n__ = 0, ao$n_p = 0;
        let ao$npn = 0, ao$np_ = 0, ao$npp = 0;
        let ao$_nn = 0, ao$_n_ = 0, ao$_np = 0;
        let ao$__n = 0,            ao$__p = 0;
        let ao$_pn = 0, ao$_p_ = 0, ao$_pp = 0;
        let ao$pnn = 0, ao$pn_ = 0, ao$pnp = 0;
        let ao$p_n = 0, ao$p__ = 0, ao$p_p = 0;
        let ao$ppn = 0, ao$pp_ = 0, ao$ppp = 0;

        for(let blockX = minBlockX, x = 0; blockX < maxBlockX; blockX++, x++) {
            for(let blockY = minBlockY, y = 0; blockY < maxBlockY; blockY++, y++) {
                for(let blockZ = minBlockZ, z = 0; blockZ < maxBlockZ; blockZ++, z++) {
                    const tile = tiles.getTile(blockX, blockY, blockZ);
                    const mesh = this.getMesh(tile);

                    if(mesh.skipRender) continue;

                    ao$nnn = this.aoWeights[tiles.getTile(blockX - 1, blockY - 1, blockZ - 1)]!;
                    ao$nn_ = this.aoWeights[tiles.getTile(blockX - 1, blockY - 1, blockZ)]!;
                    ao$nnp = this.aoWeights[tiles.getTile(blockX - 1, blockY - 1, blockZ + 1)]!;
                    ao$n_n = this.aoWeights[tiles.getTile(blockX - 1, blockY, blockZ - 1)]!;
                    ao$n__ = this.aoWeights[tiles.getTile(blockX - 1, blockY, blockZ)]!;
                    ao$n_p = this.aoWeights[tiles.getTile(blockX - 1, blockY, blockZ + 1)]!;
                    ao$npn = this.aoWeights[tiles.getTile(blockX - 1, blockY + 1, blockZ - 1)]!;
                    ao$np_ = this.aoWeights[tiles.getTile(blockX - 1, blockY + 1, blockZ)]!;
                    ao$npp = this.aoWeights[tiles.getTile(blockX - 1, blockY + 1, blockZ + 1)]!;

                    ao$_nn = this.aoWeights[tiles.getTile(blockX, blockY - 1, blockZ - 1)]!;
                    ao$_n_ = this.aoWeights[tiles.getTile(blockX, blockY - 1, blockZ)]!;
                    ao$_np = this.aoWeights[tiles.getTile(blockX, blockY - 1, blockZ + 1)]!;
                    ao$__n = this.aoWeights[tiles.getTile(blockX, blockY, blockZ - 1)]!;
                    
                    ao$__p = this.aoWeights[tiles.getTile(blockX, blockY, blockZ + 1)]!;
                    ao$_pn = this.aoWeights[tiles.getTile(blockX, blockY + 1, blockZ - 1)]!;
                    ao$_p_ = this.aoWeights[tiles.getTile(blockX, blockY + 1, blockZ)]!;
                    ao$_pp = this.aoWeights[tiles.getTile(blockX, blockY + 1, blockZ + 1)]!;

                    ao$pnn = this.aoWeights[tiles.getTile(blockX + 1, blockY - 1, blockZ - 1)]!;
                    ao$pn_ = this.aoWeights[tiles.getTile(blockX + 1, blockY - 1, blockZ)]!;
                    ao$pnp = this.aoWeights[tiles.getTile(blockX + 1, blockY - 1, blockZ + 1)]!;
                    ao$p_n = this.aoWeights[tiles.getTile(blockX + 1, blockY, blockZ - 1)]!;
                    ao$p__ = this.aoWeights[tiles.getTile(blockX + 1, blockY, blockZ)]!;
                    ao$p_p = this.aoWeights[tiles.getTile(blockX + 1, blockY, blockZ + 1)]!;
                    ao$ppn = this.aoWeights[tiles.getTile(blockX + 1, blockY + 1, blockZ - 1)]!;
                    ao$pp_ = this.aoWeights[tiles.getTile(blockX + 1, blockY + 1, blockZ)]!;
                    ao$ppp = this.aoWeights[tiles.getTile(blockX + 1, blockY + 1, blockZ + 1)]!;

                    // North
                    const showNorth = !this.getMesh(tiles.getTile(blockX, blockY, blockZ + 1)).occludeWest;
                    for(const face of mesh.north) {
                        if(face.cull && !showNorth) continue;

                        floatAttributes.push(
            /* pos      */  x + face.x, y + face.y, z + face.z,
            /* uv       */  face.uvMinX, face.uvMinY,
            /* normal   */  0, 0, 1,
            /* aoFactor */  (ao$nnp + ao$n_p + ao$_np) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  0, 0, 1,
            /* aoFactor */  (ao$npp + ao$n_p + ao$_pp) * face.aoReceiveWeight,

            /* pos      */  x + face.x + face.width, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  0, 0, 1,
            /* aoFactor */  (ao$ppp + ao$p_p + ao$_pp) * face.aoReceiveWeight,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  0, 0, 1,
            /* aoFactor */  (ao$pnp + ao$p_p + ao$_np) * face.aoReceiveWeight,

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
            /* aoFactor */  (ao$pnn + ao$p_n + ao$_nn) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  0, 0, -1,
            /* aoFactor */  (ao$ppn + ao$p_n + ao$_pn) * face.aoReceiveWeight,

            /* pos      */  x + face.x - face.width, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  0, 0, -1,
            /* aoFactor */  (ao$npn + ao$n_n + ao$_pn) * face.aoReceiveWeight,

            /* pos      */  x + face.x - face.width, y + face.y, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  0, 0, -1,
            /* aoFactor */  (ao$nnn + ao$n_n + ao$_nn) * face.aoReceiveWeight,

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
            /* aoFactor */  (ao$pnp + ao$p_p + ao$pn_) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  1, 0, 0,
            /* aoFactor */  (ao$ppp + ao$p_p + ao$pp_) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z - face.width,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  1, 0, 0,
            /* aoFactor */  (ao$ppn + ao$p_n + ao$pp_) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y, z + face.z - face.width,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  1, 0, 0,
            /* aoFactor */  (ao$pnn + ao$p_n + ao$pn_) * face.aoReceiveWeight,

                        );
                        indices.push(
                            vertexCount + 0, vertexCount + 3, vertexCount + 2,
                            vertexCount + 2, vertexCount + 1, vertexCount + 0
                        );
                        vertexCount += 4;
                    }

                    // West
                    const showWest = !this.getMesh(tiles.getTile(blockX - 1, blockY, blockZ)).occludeWest
                    for(const face of mesh.west) {
                        if(face.cull && !showWest) continue;

                        floatAttributes.push(
            /* pos      */  x + face.x, y + face.y, z + face.z,
            /* uv       */  face.uvMinX, face.uvMinY,
            /* normal   */  -1, 0, 0,
            /* aoFactor */  (ao$nnn + ao$n_n + ao$nn_) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  -1, 0, 0,
            /* aoFactor */  (ao$npn + ao$n_n + ao$np_) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y + face.height, z + face.z + face.width,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  -1, 0, 0,
            /* aoFactor */  (ao$npp + ao$n_p + ao$np_) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y, z + face.z + face.width,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  -1, 0, 0,
            /* aoFactor */  (ao$nnp + ao$n_p + ao$nn_) * face.aoReceiveWeight,

                        );
                        indices.push(
                            vertexCount + 0, vertexCount + 3, vertexCount + 2,
                            vertexCount + 2, vertexCount + 1, vertexCount + 0
                        );
                        vertexCount += 4;
                    }

                    // Up
                    const showUp = !this.getMesh(tiles.getTile(blockX, blockY + 1, blockZ)).occludeDown;
                    for(const face of mesh.up) {
                        if(face.cull && !showUp) continue;
                        
                        floatAttributes.push(
            /* pos      */  x + face.x, y + face.y, z + face.z,
            /* uv       */  face.uvMinX, face.uvMinY,
            /* normal   */  0, 1, 0,
            /* aoFactor */  (ao$npp + ao$np_ + ao$_pp) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y, z + face.z - face.height,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  0, 1, 0,
            /* aoFactor */  (ao$npn + ao$np_ + ao$_pn) * face.aoReceiveWeight,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z - face.height,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  0, 1, 0,
            /* aoFactor */  (ao$ppn + ao$pp_ + ao$_pn) * face.aoReceiveWeight,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  0, 1, 0,
            /* aoFactor */  (ao$ppp + ao$pp_ + ao$_pp) * face.aoReceiveWeight,

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
            /* aoFactor */  (ao$nnn + ao$nn_ + ao$_nn) * face.aoReceiveWeight,

            /* pos      */  x + face.x, y + face.y, z + face.z + face.height,
            /* uv       */  face.uvMinX, face.uvMaxY,
            /* normal   */  0, -1, 0,
            /* aoFactor */  (ao$nnp + ao$nn_ + ao$_np) * face.aoReceiveWeight,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z + face.height,
            /* uv       */  face.uvMaxX, face.uvMaxY,
            /* normal   */  0, -1, 0,
            /* aoFactor */  (ao$pnp + ao$pn_ + ao$_np) * face.aoReceiveWeight,

            /* pos      */  x + face.x + face.width, y + face.y, z + face.z,
            /* uv       */  face.uvMaxX, face.uvMinY,
            /* normal   */  0, -1, 0,
            /* aoFactor */  (ao$pnn + ao$pn_ + ao$_nn) * face.aoReceiveWeight,

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
            new Float32Array(floatAttributes), 9);
        
        // Use interleaved buffer data to set vertex attributes
        geometry.setAttribute("position", new InterleavedBufferAttribute(interleavedFloatAttributes, 3, 0));
        geometry.setAttribute("uv", new InterleavedBufferAttribute(interleavedFloatAttributes, 2, 3));
        geometry.setAttribute("normal", new InterleavedBufferAttribute(interleavedFloatAttributes, 3, 5));
        geometry.setAttribute("aoFactor", new InterleavedBufferAttribute(interleavedFloatAttributes, 1, 8));

        // Set indices
        geometry.setIndex(indices);

        return geometry;
    }
}