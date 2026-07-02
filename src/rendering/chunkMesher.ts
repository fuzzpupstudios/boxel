import { BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute } from "three";
import type { World } from "../world/world";
import { blockStateRegistry, getUnknownBlockState, tileRegistry } from "../block/blockRegistry";


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
    renderAnyWhenCulled: boolean;

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

class TileCache {
    public readonly halo = new Array<string>(18 ** 3);
    public readonly haloAo = new Float32Array(18 ** 3);

    public constructor(
        private readonly aoWeights: Map<string, number>
    ) {}

    public update(
        world: World,
        chunkX: number,
        chunkY: number,
        chunkZ: number
    ) {
        const chunkOriginX = chunkX << 4;
        const chunkOriginY = chunkY << 4;
        const chunkOriginZ = chunkZ << 4;

        let tile: string;
        for(let x = -1, i = 0; x < 17; x++) {
            for(let y = -1; y < 17; y++) {
                for(let z = -1; z < 17; z++, i++) {
                    tile = world.tiles.getBlockStateId(x + chunkOriginX, y + chunkOriginY, z + chunkOriginZ);
                    this.halo[i] = tile;
                    this.haloAo[i] = this.aoWeights.get(tile) || 0;
                }
            }
        }
    }

    public at(x: number, y: number, z: number) {
        return this.halo[(x + 1) * 324 + (y + 1) * 18 + (z + 1)]!;
    }
    public aoAt(x: number, y: number, z: number) {
        return this.haloAo[(x + 1) * 324 + (y + 1) * 18 + (z + 1)]!;
    }
}

export class ChunkMesher {
    public readonly tileMeshes: Map<string, TileMesh>;
    private readonly aoWeights: Map<string, number>;
    private readonly tileCache: TileCache;
    private readonly defaultMesh: TileMesh;

    public constructor(
        public readonly world: World
    ) {
        // Optimize: memoize block models and their AO cast
        // weights, indexed by their block state's tile id
        this.tileMeshes = new Map;
        for(const blockStateId of tileRegistry.values()) {
            const blockState = blockStateRegistry.get(blockStateId)!;
            
            try {
                const compiledModel = blockState.model.compile();
                this.tileMeshes.set(blockStateId, compiledModel);
            } catch(e) {
                throw new Error("Failed to compile block model " + blockState, { cause: e });
            }
        }

        this.defaultMesh = getUnknownBlockState().model.compile();

        this.aoWeights = new Map();
        for(const [ blockStateId, tileMesh ] of this.tileMeshes) {
            this.aoWeights.set(blockStateId, tileMesh!.aoCastWeight);
        }

        this.tileCache = new TileCache(this.aoWeights);
    }

    private getMesh(tile: string) {
        return this.tileMeshes.get(tile) || this.defaultMesh;
    }

    public mesh(chunkX: number, chunkY: number, chunkZ: number) {
        // Optimize: use an 18x18x18 "halo" tile buffer
        // to cache tiles and AO, so VoxelGrid#tileAt() isn't
        // called so frequently
        const tiles = this.tileCache;
        tiles.update(this.world, chunkX, chunkY, chunkZ);

        // [ pos.x, pos.y, pos.z, uv.x, uv.y, normal.x, normal.y, normal.z, aoFactor ]
        const floatAttributes = new Array;
        const indices = new Array;

        let vertexCount = 0;

        let ao$nnn = 0, ao$nn_ = 0, ao$nnp = 0;
        let ao$n_n = 0,             ao$n_p = 0;
        let ao$npn = 0, ao$np_ = 0, ao$npp = 0;
        let ao$_nn = 0,             ao$_np = 0;
        let ao$_pn = 0,             ao$_pp = 0;
        let ao$pnn = 0, ao$pn_ = 0, ao$pnp = 0;
        let ao$p_n = 0,             ao$p_p = 0;
        let ao$ppn = 0, ao$pp_ = 0, ao$ppp = 0;

        for(let x = 0; x < 16; x++) {
            for(let y = 0; y < 16; y++) {
                for(let z = 0; z < 16; z++) {
                    const tile = tiles.at(x, y, z);
                    const mesh = this.getMesh(tile);

                    if(mesh.skipRender) continue;

                    const showNorth = !this.getMesh(tiles.at(x, y, z + 1)).occludeSouth;
                    const showSouth = !this.getMesh(tiles.at(x, y, z - 1)).occludeNorth;
                    const showEast = !this.getMesh(tiles.at(x + 1, y, z)).occludeWest;
                    const showWest = !this.getMesh(tiles.at(x - 1, y, z)).occludeEast;
                    const showUp = !this.getMesh(tiles.at(x, y + 1, z)).occludeDown;
                    const showDown = !this.getMesh(tiles.at(x, y - 1, z)).occludeUp;

                    // Optimize: when blocks on all sides cull this block, and this
                    // block doesn't render anything when all faces are culled, skip
                    // the rest of the checks (ao tile fetching, face iteration, etc.)
                    if(!(showNorth || showSouth || showEast || showWest || showUp || showDown)) {
                        if(!mesh.renderAnyWhenCulled) continue;
                    }

                    ao$nnn = tiles.aoAt(x - 1, y - 1, z - 1);
                    ao$nn_ = tiles.aoAt(x - 1, y - 1, z);
                    ao$nnp = tiles.aoAt(x - 1, y - 1, z + 1);
                    ao$n_n = tiles.aoAt(x - 1, y, z - 1);
                    
                    ao$n_p = tiles.aoAt(x - 1, y, z + 1);
                    ao$npn = tiles.aoAt(x - 1, y + 1, z - 1);
                    ao$np_ = tiles.aoAt(x - 1, y + 1, z);
                    ao$npp = tiles.aoAt(x - 1, y + 1, z + 1);

                    ao$_nn = tiles.aoAt(x, y - 1, z - 1);
                    ao$_np = tiles.aoAt(x, y - 1, z + 1);
                    
                    ao$_pn = tiles.aoAt(x, y + 1, z - 1);
                    ao$_pp = tiles.aoAt(x, y + 1, z + 1);

                    ao$pnn = tiles.aoAt(x + 1, y - 1, z - 1);
                    ao$pn_ = tiles.aoAt(x + 1, y - 1, z);
                    ao$pnp = tiles.aoAt(x + 1, y - 1, z + 1);
                    ao$p_n = tiles.aoAt(x + 1, y, z - 1);
                    
                    ao$p_p = tiles.aoAt(x + 1, y, z + 1);
                    ao$ppn = tiles.aoAt(x + 1, y + 1, z - 1);
                    ao$pp_ = tiles.aoAt(x + 1, y + 1, z);
                    ao$ppp = tiles.aoAt(x + 1, y + 1, z + 1);

                    // North
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