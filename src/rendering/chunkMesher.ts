import { BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute, IntType, Uint16BufferAttribute } from "three";
import type { World } from "../world/world";
import { blockStateRegistry, getUnknownBlockState, tileRegistry } from "../block/blockRegistry";


function averageLightNibble(a: number, b: number, c: number, d: number, shift: number) {
    return (((a >> shift) & 0xf) + ((b >> shift) & 0xf) + ((c >> shift) & 0xf) + ((d >> shift) & 0xf) + 2) >> 2;
}

function averageLight(a: number, b: number, c: number, d: number) {
    return averageLightNibble(a, b, c, d, 0)
        | averageLightNibble(a, b, c, d, 4) << 4
        | averageLightNibble(a, b, c, d, 8) << 8
        | averageLightNibble(a, b, c, d, 12) << 12;
}


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
    renderAnyWhenCulled: boolean;

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

class TileCache {
    public readonly halo = new Array<string>(18 ** 3);
    public readonly haloLighting = new Uint16Array(18 ** 3);

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
                    this.haloLighting[i] = world.lighting.values.getRaw(x + chunkOriginX, y + chunkOriginY, z + chunkOriginZ);
                }
            }
        }
    }

    public at(x: number, y: number, z: number) {
        return this.halo[(x + 1) * 324 + (y + 1) * 18 + (z + 1)]!;
    }
    public lightingAt(x: number, y: number, z: number) {
        return this.haloLighting[(x + 1) * 324 + (y + 1) * 18 + (z + 1)]!;
    }
}

export class ChunkMesher {
    public readonly tileMeshes: Map<string, TileMesh>;
    private readonly tileCache: TileCache;
    private readonly defaultMesh: TileMesh;

    public constructor(
        public readonly world: World
    ) {
        // Optimize: memoize block models, indexed by their block state's tile id
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

        this.tileCache = new TileCache();
    }

    private getMesh(tile: string) {
        return this.tileMeshes.get(tile) || this.defaultMesh;
    }

    public mesh(chunkX: number, chunkY: number, chunkZ: number) {
        // Optimize: use an 18x18x18 "halo" tile buffer
        // to cache tiles, so VoxelGrid#tileAt() isn't
        // called so frequently
        const tiles = this.tileCache;
        tiles.update(this.world, chunkX, chunkY, chunkZ);

        // [ pos.x, pos.y, pos.z, uv.x, uv.y, normal.x, normal.y, normal.z ]
        const floatAttributes = new Array;
        const lighting = new Array;
        const indices = new Array;

        let vertexCount = 0;

        let light$nnn = 0, light$nn_ = 0, light$nnp = 0;
        let light$n_n = 0, light$n__ = 0, light$n_p = 0;
        let light$npn = 0, light$np_ = 0, light$npp = 0;
        let light$_nn = 0, light$_n_ = 0, light$_np = 0;
        let light$__n = 0, light$__p = 0;
        let light$_pn = 0, light$_p_ = 0, light$_pp = 0;
        let light$pnn = 0, light$pn_ = 0, light$pnp = 0;
        let light$p_n = 0, light$p__ = 0, light$p_p = 0;
        let light$ppn = 0, light$pp_ = 0, light$ppp = 0;

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
                    // the rest of the checks (face iteration, etc.)
                    if(!(showNorth || showSouth || showEast || showWest || showUp || showDown)) {
                        if(!mesh.renderAnyWhenCulled) continue;
                    }


                    light$nnn = tiles.lightingAt(x - 1, y - 1, z - 1);
                    light$nn_ = tiles.lightingAt(x - 1, y - 1, z);
                    light$nnp = tiles.lightingAt(x - 1, y - 1, z + 1);
                    light$n_n = tiles.lightingAt(x - 1, y, z - 1);
                    light$n__ = tiles.lightingAt(x - 1, y, z);
                    light$n_p = tiles.lightingAt(x - 1, y, z + 1);
                    light$npn = tiles.lightingAt(x - 1, y + 1, z - 1);
                    light$np_ = tiles.lightingAt(x - 1, y + 1, z);
                    light$npp = tiles.lightingAt(x - 1, y + 1, z + 1);

                    light$_nn = tiles.lightingAt(x, y - 1, z - 1);
                    light$_n_ = tiles.lightingAt(x, y - 1, z);
                    light$_np = tiles.lightingAt(x, y - 1, z + 1);
                    light$__n = tiles.lightingAt(x, y, z - 1);
                    light$__p = tiles.lightingAt(x, y, z + 1);
                    light$_pn = tiles.lightingAt(x, y + 1, z - 1);
                    light$_p_ = tiles.lightingAt(x, y + 1, z);
                    light$_pp = tiles.lightingAt(x, y + 1, z + 1);

                    light$pnn = tiles.lightingAt(x + 1, y - 1, z - 1);
                    light$pn_ = tiles.lightingAt(x + 1, y - 1, z);
                    light$pnp = tiles.lightingAt(x + 1, y - 1, z + 1);
                    light$p_n = tiles.lightingAt(x + 1, y, z - 1);
                    light$p__ = tiles.lightingAt(x + 1, y, z);
                    light$p_p = tiles.lightingAt(x + 1, y, z + 1);
                    light$ppn = tiles.lightingAt(x + 1, y + 1, z - 1);
                    light$pp_ = tiles.lightingAt(x + 1, y + 1, z);
                    light$ppp = tiles.lightingAt(x + 1, y + 1, z + 1);

                    // North
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
                        lighting.push(
                            averageLight(light$__p, light$n_p, light$_np, light$nnp),
                            averageLight(light$__p, light$n_p, light$_pp, light$npp),
                            averageLight(light$__p, light$p_p, light$_pp, light$ppp),
                            averageLight(light$__p, light$p_p, light$_np, light$pnp)
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
                        lighting.push(
                            averageLight(light$__n, light$p_n, light$_nn, light$pnn),
                            averageLight(light$__n, light$p_n, light$_pn, light$ppn),
                            averageLight(light$__n, light$n_n, light$_pn, light$npn),
                            averageLight(light$__n, light$n_n, light$_nn, light$nnn)
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
                        lighting.push(
                            averageLight(light$p_p, light$p__, light$pnp, light$pn_),
                            averageLight(light$p_p, light$p__, light$ppp, light$pp_),
                            averageLight(light$p_n, light$p__, light$ppn, light$pp_),
                            averageLight(light$p_n, light$p__, light$pnn, light$pn_)
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
                        lighting.push(
                            averageLight(light$n_n, light$n__, light$nnn, light$nn_),
                            averageLight(light$n_n, light$n__, light$npn, light$np_),
                            averageLight(light$n_p, light$n__, light$npp, light$np_),
                            averageLight(light$n_p, light$n__, light$nnp, light$nn_)
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
                        lighting.push(
                            averageLight(light$_p_, light$np_, light$_pp, light$npp),
                            averageLight(light$_p_, light$np_, light$_pn, light$npn),
                            averageLight(light$_p_, light$pp_, light$_pn, light$ppn),
                            averageLight(light$_p_, light$pp_, light$_pp, light$ppp)
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
                        lighting.push(
                            averageLight(light$_n_, light$nn_, light$_nn, light$nnn),
                            averageLight(light$_n_, light$nn_, light$_np, light$nnp),
                            averageLight(light$_n_, light$pn_, light$_np, light$pnp),
                            averageLight(light$_n_, light$pn_, light$_nn, light$pnn)
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

        // Copy lighting data to Uint16Array and make it a Uint16BufferAttribute
        const lightingAttribute = new Uint16BufferAttribute(lighting, 1);
        lightingAttribute.gpuType = IntType;
        
        // Use interleaved buffer data to set vertex attributes
        geometry.setAttribute("position", new InterleavedBufferAttribute(interleavedFloatAttributes, 3, 0));
        geometry.setAttribute("uv", new InterleavedBufferAttribute(interleavedFloatAttributes, 2, 3));
        geometry.setAttribute("normal", new InterleavedBufferAttribute(interleavedFloatAttributes, 3, 5));
        geometry.setAttribute("lighting", lightingAttribute);

        // Set indices
        geometry.setIndex(indices);

        return geometry;
    }
}