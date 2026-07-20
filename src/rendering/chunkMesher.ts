import { BufferGeometry, ByteType, ClampToEdgeWrapping, Data3DTexture, HalfFloatType, InterleavedBuffer, InterleavedBufferAttribute, IntType, LinearFilter, RGBAFormat, Uint16BufferAttribute, Uint8BufferAttribute } from "three";
import type { World } from "../world/world";
import { blockStateRegistry, getUnknownBlockState, tileRegistry } from "../block/blockRegistry";


export interface TileFace {
    x0: number, y0: number, z0: number;
    x1: number, y1: number, z1: number;
    x2: number, y2: number, z2: number;
    x3: number, y3: number, z3: number;
    u0: number, v0: number;
    u1: number, v1: number;
    u2: number, v2: number;
    u3: number, v3: number;
    cull: boolean;
    typeMask: number;

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
    public readonly lighting: Float16Array | Float32Array;
    private readonly lightChannelCount: number;
    
    public constructor(
        private readonly world: World,
        private readonly aoWeights: Map<string, number>
    ) {
        this.lightChannelCount = world.lighting.lightChannels.length;
        this.lighting = new (Float16Array || Float32Array)(18 ** 3 * this.lightChannelCount);
    }

    public update(
        chunkX: number,
        chunkY: number,
        chunkZ: number
    ) {
        const chunkOriginX = chunkX << 4;
        const chunkOriginY = chunkY << 4;
        const chunkOriginZ = chunkZ << 4;

        const world = this.world;
        const lightChannelCount = this.lightChannelCount;
        const lightChannels = world.lighting.lightChannels;
        const lightStrength = 1 / 15;

        let tile: string;
        for(let x = -1, i = 0, k = 0; x < 17; x++) {
            for(let y = -1; y < 17; y++) {
                for(let z = -1; z < 17; z++, i++) {
                    tile = world.tiles.getBlockStateId(x + chunkOriginX, y + chunkOriginY, z + chunkOriginZ);
                    this.halo[i] = tile;
                    this.haloAo[i] = this.aoWeights.get(tile) || 0;

                    for(let j = 0; j < lightChannelCount; j++, k++) {
                        this.lighting[k] = lightChannels[j]!.get(
                            x + chunkOriginX,
                            y + chunkOriginY,
                            z + chunkOriginZ
                        ) * lightStrength;
                    }
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
    public retrieveLightingAt(x: number, y: number, z: number, out: number[]) {
        const X = 324 * this.lightChannelCount;
        const Y = 18 * this.lightChannelCount;
        const Z = this.lightChannelCount;
        let j = (x + 1) * X + (y + 1) * Y + (z + 1) * Z;

        for(let i = 0; i < this.lightChannelCount; i++, j++) {
            out[i] = Math.max(
                this.lighting[j]!,
                this.lighting[j - Z]!,
                this.lighting[j - Y]!,
                this.lighting[j - Y - Z]!,
                this.lighting[j - X]!,
                this.lighting[j - X - Z]!,
                this.lighting[j - X - Y]!,
                this.lighting[j - X - Y - Z]!,
            );
        }
    }
}

export class ChunkMesher {
    public readonly tileMeshes: Map<string, TileMesh>;
    private readonly aoWeights: Map<string, number>;
    private readonly tileCache: TileCache;
    private readonly defaultMesh: TileMesh;
    private readonly lightChannelCount: number;
    private readonly geometryFloatAttributes: Float32Array;
    private readonly geometryFaceType: Uint16Array;
    private readonly geometryIndex: Uint32Array;

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

        this.aoWeights = new Map();
        for(const [ blockStateId, tileMesh ] of this.tileMeshes) {
            this.aoWeights.set(blockStateId, tileMesh!.aoCastWeight);
        }

        this.tileCache = new TileCache(world, this.aoWeights);
        this.lightChannelCount = world.lighting.lightChannels.length;

        // ~150 MB maximum mesh size (should be more than enough..?)
        const MAX_VERTEX_COUNT = 2 ** 22;

        // [ pos.x, pos.y, pos.z, uv.x, uv.y, normal.x, normal.y, normal.z, aoFactor, color*... ]
        this.geometryFloatAttributes = new Float32Array(MAX_VERTEX_COUNT * (3 + 2 + 3 + 1 + this.lightChannelCount));

        // [ faceType ]
        // { <15x none> <lit> }
        this.geometryFaceType = new Uint16Array(MAX_VERTEX_COUNT);

        this.geometryIndex = new Uint32Array(MAX_VERTEX_COUNT * (6 / 4));
    }

    private getMesh(tile: string) {
        return this.tileMeshes.get(tile) || this.defaultMesh;
    }

    public mesh(chunkX: number, chunkY: number, chunkZ: number) {
        // Optimize: use an 18x18x18 "halo" tile buffer
        // to cache tiles, so VoxelGrid#tileAt() isn't
        // called so frequently
        const tiles = this.tileCache;
        tiles.update(chunkX, chunkY, chunkZ);

        // const floatAttributes = this.geometryFloatAttributes;
        // const faceType = this.geometryFaceType;
        // const index = this.geometryIndex;

        const lightChannelCount = this.lightChannelCount;
        const floatAttributes: number[] = new Array;
        const faceType: number[] = new Array;
        const indices: number[] = new Array;

        let vertexCount = 0;

        let ao$nnn = 0, ao$nn_ = 0, ao$nnp = 0;
        let ao$n_n = 0,             ao$n_p = 0;
        let ao$npn = 0, ao$np_ = 0, ao$npp = 0;
        let ao$_nn = 0,             ao$_np = 0;
        let ao$_pn = 0,             ao$_pp = 0;
        let ao$pnn = 0, ao$pn_ = 0, ao$pnp = 0;
        let ao$p_n = 0,             ao$p_p = 0;
        let ao$ppn = 0, ao$pp_ = 0, ao$ppp = 0;

        let light$nnn = Array.from(new Uint8Array(lightChannelCount));
        let light$nnp = Array.from(new Uint8Array(lightChannelCount));
        let light$npn = Array.from(new Uint8Array(lightChannelCount));
        let light$npp = Array.from(new Uint8Array(lightChannelCount));
        let light$pnn = Array.from(new Uint8Array(lightChannelCount));
        let light$pnp = Array.from(new Uint8Array(lightChannelCount));
        let light$ppn = Array.from(new Uint8Array(lightChannelCount));
        let light$ppp = Array.from(new Uint8Array(lightChannelCount));

        for(let x = 0; x < 16; x++) {
            for(let y = 0; y < 16; y++) {
                for(let z = 0; z < 16; z++) {
                    const tile = tiles.at(x, y, z);
                    const mesh = this.getMesh(tile);

                    if(mesh.skipRender) continue;

                    const showNorth = !this.getMesh(tiles.at(x, y, z - 1)).occludeSouth;
                    const showSouth = !this.getMesh(tiles.at(x, y, z + 1)).occludeNorth;
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

                    tiles.retrieveLightingAt(x, y, z, light$nnn);
                    tiles.retrieveLightingAt(x, y, z + 1, light$nnp);
                    tiles.retrieveLightingAt(x, y + 1, z, light$npn);
                    tiles.retrieveLightingAt(x, y + 1, z + 1, light$npp);
                    tiles.retrieveLightingAt(x + 1, y, z, light$pnn);
                    tiles.retrieveLightingAt(x + 1, y, z + 1, light$pnp);
                    tiles.retrieveLightingAt(x + 1, y + 1, z, light$ppn);
                    tiles.retrieveLightingAt(x + 1, y + 1, z + 1, light$ppp);

                    // North
                    for(const face of mesh.north) {
                        if(face.cull && !showNorth) continue;

                        floatAttributes.push(
            /* pos      */  x + face.x0, y + face.y0, z + face.z0,
            /* uv       */  face.u0, face.v0,
            /* normal   */  0, 0, -1,
            /* aoFactor */  (ao$pnn + ao$p_n + ao$_nn) * face.aoReceiveWeight,
            /* light    */  ...light$pnn,

            /* pos      */  x + face.x1, y + face.y1, z + face.z1,
            /* uv       */  face.u1, face.v1,
            /* normal   */  0, 0, -1,
            /* aoFactor */  (ao$ppn + ao$p_n + ao$_pn) * face.aoReceiveWeight,
            /* light    */  ...light$ppn,

            /* pos      */  x + face.x2, y + face.y2, z + face.z2,
            /* uv       */  face.u2, face.v2,
            /* normal   */  0, 0, -1,
            /* aoFactor */  (ao$npn + ao$n_n + ao$_pn) * face.aoReceiveWeight,
            /* light    */  ...light$npn,

            /* pos      */  x + face.x3, y + face.y3, z + face.z3,
            /* uv       */  face.u3, face.v3,
            /* normal   */  0, 0, -1,
            /* aoFactor */  (ao$nnn + ao$n_n + ao$_nn) * face.aoReceiveWeight,
            /* light    */  ...light$nnn,
                        );
                        faceType.push(face.typeMask, face.typeMask, face.typeMask, face.typeMask);
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
            /* pos      */  x + face.x0, y + face.y0, z + face.z0,
            /* uv       */  face.u0, face.v0,
            /* normal   */  0, 0, 1,
            /* aoFactor */  (ao$nnp + ao$n_p + ao$_np) * face.aoReceiveWeight,
            /* light    */  ...light$nnp,

            /* pos      */  x + face.x1, y + face.y1, z + face.z1,
            /* uv       */  face.u1, face.v1,
            /* normal   */  0, 0, 1,
            /* aoFactor */  (ao$npp + ao$n_p + ao$_pp) * face.aoReceiveWeight,
            /* light    */  ...light$npp,

            /* pos      */  x + face.x2, y + face.y2, z + face.z2,
            /* uv       */  face.u2, face.v2,
            /* normal   */  0, 0, 1,
            /* aoFactor */  (ao$ppp + ao$p_p + ao$_pp) * face.aoReceiveWeight,
            /* light    */  ...light$ppp,

            /* pos      */  x + face.x3, y + face.y3, z + face.z3,
            /* uv       */  face.u3, face.v3,
            /* normal   */  0, 0, 1,
            /* aoFactor */  (ao$pnp + ao$p_p + ao$_np) * face.aoReceiveWeight,
            /* light    */  ...light$pnp,
                        );
                        faceType.push(face.typeMask, face.typeMask, face.typeMask, face.typeMask);
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
            /* pos      */  x + face.x0, y + face.y0, z + face.z0,
            /* uv       */  face.u0, face.v0,
            /* normal   */  1, 0, 0,
            /* aoFactor */  (ao$pnp + ao$p_p + ao$pn_) * face.aoReceiveWeight,
            /* light    */  ...light$pnp,

            /* pos      */  x + face.x1, y + face.y1, z + face.z1,
            /* uv       */  face.u1, face.v1,
            /* normal   */  1, 0, 0,
            /* aoFactor */  (ao$ppp + ao$p_p + ao$pp_) * face.aoReceiveWeight,
            /* light    */  ...light$ppp,

            /* pos      */  x + face.x2, y + face.y2, z + face.z2,
            /* uv       */  face.u2, face.v2,
            /* normal   */  1, 0, 0,
            /* aoFactor */  (ao$ppn + ao$p_n + ao$pp_) * face.aoReceiveWeight,
            /* light    */  ...light$ppn,

            /* pos      */  x + face.x3, y + face.y3, z + face.z3,
            /* uv       */  face.u3, face.v3,
            /* normal   */  1, 0, 0,
            /* aoFactor */  (ao$pnn + ao$p_n + ao$pn_) * face.aoReceiveWeight,
            /* light    */  ...light$pnn,
                        );
                        faceType.push(face.typeMask, face.typeMask, face.typeMask, face.typeMask);
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
            /* pos      */  x + face.x0, y + face.y0, z + face.z0,
            /* uv       */  face.u0, face.v0,
            /* normal   */  -1, 0, 0,
            /* aoFactor */  (ao$nnn + ao$n_n + ao$nn_) * face.aoReceiveWeight,
            /* light    */  ...light$nnn,

            /* pos      */  x + face.x1, y + face.y1, z + face.z1,
            /* uv       */  face.u1, face.v1,
            /* normal   */  -1, 0, 0,
            /* aoFactor */  (ao$npn + ao$n_n + ao$np_) * face.aoReceiveWeight,
            /* light    */  ...light$npn,

            /* pos      */  x + face.x2, y + face.y2, z + face.z2,
            /* uv       */  face.u2, face.v2,
            /* normal   */  -1, 0, 0,
            /* aoFactor */  (ao$npp + ao$n_p + ao$np_) * face.aoReceiveWeight,
            /* light    */  ...light$npp,

            /* pos      */  x + face.x3, y + face.y3, z + face.z3,
            /* uv       */  face.u3, face.v3,
            /* normal   */  -1, 0, 0,
            /* aoFactor */  (ao$nnp + ao$n_p + ao$nn_) * face.aoReceiveWeight,
            /* light    */  ...light$nnp,
                        );
                        faceType.push(face.typeMask, face.typeMask, face.typeMask, face.typeMask);
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
            /* pos      */  x + face.x0, y + face.y0, z + face.z0,
            /* uv       */  face.u0, face.v0,
            /* normal   */  0, 1, 0,
            /* aoFactor */  (ao$npp + ao$np_ + ao$_pp) * face.aoReceiveWeight,
            /* light    */  ...light$npp,

            /* pos      */  x + face.x1, y + face.y1, z + face.z1,
            /* uv       */  face.u1, face.v1,
            /* normal   */  0, 1, 0,
            /* aoFactor */  (ao$npn + ao$np_ + ao$_pn) * face.aoReceiveWeight,
            /* light    */  ...light$npn,

            /* pos      */  x + face.x2, y + face.y2, z + face.z2,
            /* uv       */  face.u2, face.v2,
            /* normal   */  0, 1, 0,
            /* aoFactor */  (ao$ppn + ao$pp_ + ao$_pn) * face.aoReceiveWeight,
            /* light    */  ...light$ppn,

            /* pos      */  x + face.x3, y + face.y3, z + face.z3,
            /* uv       */  face.u3, face.v3,
            /* normal   */  0, 1, 0,
            /* aoFactor */  (ao$ppp + ao$pp_ + ao$_pp) * face.aoReceiveWeight,
            /* light    */  ...light$ppp,
                        );
                        faceType.push(face.typeMask, face.typeMask, face.typeMask, face.typeMask);
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
            /* pos      */  x + face.x0, y + face.y0, z + face.z0,
            /* uv       */  face.u0, face.v0,
            /* normal   */  0, -1, 0,
            /* aoFactor */  (ao$nnn + ao$nn_ + ao$_nn) * face.aoReceiveWeight,
            /* light    */  ...light$nnn,

            /* pos      */  x + face.x1, y + face.y1, z + face.z1,
            /* uv       */  face.u1, face.v1,
            /* normal   */  0, -1, 0,
            /* aoFactor */  (ao$nnp + ao$nn_ + ao$_np) * face.aoReceiveWeight,
            /* light    */  ...light$nnp,

            /* pos      */  x + face.x2, y + face.y2, z + face.z2,
            /* uv       */  face.u2, face.v2,
            /* normal   */  0, -1, 0,
            /* aoFactor */  (ao$pnp + ao$pn_ + ao$_np) * face.aoReceiveWeight,
            /* light    */  ...light$pnp,

            /* pos      */  x + face.x3, y + face.y3, z + face.z3,
            /* uv       */  face.u3, face.v3,
            /* normal   */  0, -1, 0,
            /* aoFactor */  (ao$pnn + ao$pn_ + ao$_nn) * face.aoReceiveWeight,
            /* light    */  ...light$pnn,
                        );
                        faceType.push(face.typeMask, face.typeMask, face.typeMask, face.typeMask);
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
            new Float32Array(floatAttributes), 9 + lightChannelCount);

        // Copy face type data to Uint16Array and make it a Uint16BufferAttribute
        const faceTypeAttribute = new Uint16BufferAttribute(faceType, 1);
        faceTypeAttribute.gpuType = IntType;
        
        // Use interleaved buffer data to set vertex attributes
        geometry.setAttribute("position", new InterleavedBufferAttribute(interleavedFloatAttributes, 3, 0));
        geometry.setAttribute("uv", new InterleavedBufferAttribute(interleavedFloatAttributes, 2, 3));
        geometry.setAttribute("normal", new InterleavedBufferAttribute(interleavedFloatAttributes, 3, 5));
        geometry.setAttribute("aoFactor", new InterleavedBufferAttribute(interleavedFloatAttributes, 1, 8));
        
        for(let i = 0; i < lightChannelCount; i++) {
            geometry.setAttribute("light" + i, new InterleavedBufferAttribute(interleavedFloatAttributes, 1, 9 + i));
        }
        geometry.setAttribute("faceType", faceTypeAttribute);

        // Set indices
        geometry.setIndex(indices);

        return geometry;
    }
}