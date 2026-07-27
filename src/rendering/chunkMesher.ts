import { BufferAttribute, BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute, IntType, Uint16BufferAttribute } from "three";
import { blockStateRegistry, getUnknownBlockState, tileRegistry } from "../block/blockRegistry";
import { LightingChunk } from "../world/lighting/lightingGrid";
import type { VoxelChunk } from "../world/voxelGrid";
import type { World } from "../world/world";


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
    public readonly meshes = new Uint32Array(18 ** 3);
    public readonly haloAo = new Float32Array(18 ** 3);
    public readonly lighting: Float16Array | Float32Array;
    private readonly lightChannelCount: number;
    private readonly chunkMeshPalette = new Uint32Array(256);
    private readonly emptyLightingChunk = new LightingChunk;
    
    public constructor(
        private readonly world: World,
        private readonly aoWeights: Float32Array,
        private readonly tileMeshes: Map<string, number>,
        private readonly defaultMesh: number
    ) {
        this.lightChannelCount = world.lightingManager.lightChannels.length;
        this.lighting = new (Float16Array || Float32Array)(18 ** 3 * this.lightChannelCount);
    }

    public update(
        chunkX: number,
        chunkY: number,
        chunkZ: number,
        chunkTiles: VoxelChunk | null
    ) {
        const chunkOriginX = chunkX << 4;
        const chunkOriginY = chunkY << 4;
        const chunkOriginZ = chunkZ << 4;

        const world = this.world;

        if(chunkTiles == null) return;

        const lightChannelCount = this.lightChannelCount;
        const lightChannels = world.lightingManager.lightChannels;

        const lightingChunks = [];
        for(const lightChannel of lightChannels) {
            lightingChunks.push(lightChannel.lightingGrid.getChunk(chunkX, chunkY, chunkZ) || this.emptyLightingChunk);
        }

        for(let i = 0; i < this.chunkMeshPalette.length; i++) {
            const blockStateId = chunkTiles.palette[i]!;
            this.chunkMeshPalette[i] = this.tileMeshes.get(blockStateId) ?? this.defaultMesh;
        }
        const lightStrength = 1 / 15;

        let tile: number;
        for(let x = -1, i = 0, k = 0; x < 17; x++) {
            for(let y = -1; y < 17; y++) {
                for(let z = -1; z < 17; z++, i++) {
                    if(x > -1 && x < 16 && y > -1 && y < 16 && z > -1 && z < 16) {
                        tile = this.chunkMeshPalette[chunkTiles.getTile(x, y, z)!]!;

                        for(let j = 0; j < lightChannelCount; j++, k++) {
                            this.lighting[k] = lightingChunks[j]!.get(
                                x, y, z
                            ) * lightStrength;
                        }
                    } else {
                        tile = this.tileMeshes.get(world.tiles.getBlockStateId(x + chunkOriginX, y + chunkOriginY, z + chunkOriginZ))!;

                        for(let j = 0; j < lightChannelCount; j++, k++) {
                            this.lighting[k] = lightChannels[j]!.get(
                                x + chunkOriginX,
                                y + chunkOriginY,
                                z + chunkOriginZ
                            ) * lightStrength;
                        }
                    }
                    this.meshes[i] = tile;
                    this.haloAo[i] = this.aoWeights[tile] || 0;
                }
            }
        }
    }

    public at(x: number, y: number, z: number) {
        return this.meshes[(x + 1) * 324 + (y + 1) * 18 + (z + 1)]!;
    }
    public aoAt(x: number, y: number, z: number) {
        return this.haloAo[(x + 1) * 324 + (y + 1) * 18 + (z + 1)]!;
    }
    public retrieveLightingAt(x: number, y: number, z: number, out: Record<number, number>) {
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
    private readonly tileMeshes: TileMesh[];
    private readonly skipRenderMeshes = new Set<string>;
    private readonly aoWeights: Float32Array;
    private readonly tileMeshIndices: Map<string, number>;
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
        const blockStateIds = Array.from(tileRegistry.values());
        this.tileMeshes = new Array;
        this.tileMeshIndices = new Map;
        this.aoWeights = new Float32Array(blockStateIds.length);

        for(let i = 0; i < blockStateIds.length; i++) {
            const blockStateId = blockStateIds[i]!;

            const blockState = blockStateRegistry.get(blockStateId)!;
            this.tileMeshIndices.set(blockStateId, i);
            
            try {
                const compiledModel = blockState.model.compile();

                this.tileMeshes[i] = compiledModel;
                this.aoWeights[i] = compiledModel.aoCastWeight;

                if(compiledModel.skipRender) {
                    this.skipRenderMeshes.add(blockStateId);
                }
            } catch(e) {
                throw new Error("Failed to compile block model " + blockState, { cause: e });
            }
        }

        const defaultIndex = this.tileMeshIndices.get(getUnknownBlockState().getFullId()) || 0;
        this.defaultMesh = this.tileMeshes[defaultIndex]!;

        this.tileCache = new TileCache(world, this.aoWeights, this.tileMeshIndices, defaultIndex);
        this.lightChannelCount = world.lightingManager.lightChannels.length;

        // ~150 MB maximum mesh size (should be more than enough..?)
        const MAX_VERTEX_COUNT = 2 ** 22;

        // [ pos.x, pos.y, pos.z, uv.x, uv.y, normal.x, normal.y, normal.z, aoFactor, color*... ]
        this.geometryFloatAttributes = new Float32Array(MAX_VERTEX_COUNT * (3 + 2 + 3 + 1 + this.lightChannelCount));

        // [ faceType ]
        // { <15x none> <lit> }
        this.geometryFaceType = new Uint16Array(MAX_VERTEX_COUNT);

        this.geometryIndex = new Uint32Array(MAX_VERTEX_COUNT * (6 / 4));
    }

    public getCompiledMeshes() {
        const map = new Map<string, TileMesh>;

        for(const [ blockStateId, tileMeshIndex ] of this.tileMeshIndices.entries()) {
            map.set(blockStateId, this.tileMeshes[tileMeshIndex]!);
        }

        return map;
    }

    private getMesh(tile: number) {
        return this.tileMeshes[tile] || this.defaultMesh;
    }

    public mesh(chunkX: number, chunkY: number, chunkZ: number) {
        const chunkTiles = this.world.tiles.getChunk(chunkX, chunkY, chunkZ) || null;
        if(chunkTiles == null) return null;
        
        if(chunkTiles.entireSingleTile && this.skipRenderMeshes.has(chunkTiles.palette[0]!)) {
            return null;
        }

        // Optimize: use an 18x18x18 "halo" tile buffer
        // to cache tiles, so VoxelGrid#tileAt() isn't
        // called so frequently
        const tiles = this.tileCache;
        tiles.update(chunkX, chunkY, chunkZ, chunkTiles);

        const floatAttributes = this.geometryFloatAttributes;
        const faceType = this.geometryFaceType;
        const index = this.geometryIndex;

        const lightChannelCount = this.lightChannelCount;

        let floatAttributeOffset = 0;
        const floatAttributeStride = (9 + lightChannelCount);

        let indexOffset = 0;
        let vertexCount = 0;

        let ao$nnn = 0, ao$nn_ = 0, ao$nnp = 0;
        let ao$n_n = 0,             ao$n_p = 0;
        let ao$npn = 0, ao$np_ = 0, ao$npp = 0;
        let ao$_nn = 0,             ao$_np = 0;
        let ao$_pn = 0,             ao$_pp = 0;
        let ao$pnn = 0, ao$pn_ = 0, ao$pnp = 0;
        let ao$p_n = 0,             ao$p_p = 0;
        let ao$ppn = 0, ao$pp_ = 0, ao$ppp = 0;

        const lightDefault = new Float32Array(lightChannelCount);
        let light$nnn = Array.from(lightDefault);
        let light$nnp = Array.from(lightDefault);
        let light$npn = Array.from(lightDefault);
        let light$npp = Array.from(lightDefault);
        let light$pnn = Array.from(lightDefault);
        let light$pnp = Array.from(lightDefault);
        let light$ppn = Array.from(lightDefault);
        let light$ppp = Array.from(lightDefault);

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

                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x0;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y0;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z0;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u0;
                        floatAttributes[floatAttributeOffset + 4] = face.v0;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = -1;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$pnn + ao$p_n + ao$_nn) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$pnn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x1;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y1;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z1;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u1;
                        floatAttributes[floatAttributeOffset + 4] = face.v1;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = -1;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$ppn + ao$p_n + ao$_pn) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$ppn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x2;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y2;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z2;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u2;
                        floatAttributes[floatAttributeOffset + 4] = face.v2;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = -1;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$npn + ao$n_n + ao$_pn) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$npn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x3;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y3;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z3;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u3;
                        floatAttributes[floatAttributeOffset + 4] = face.v3;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = -1;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$nnn + ao$n_n + ao$_nn) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$nnn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;

                        faceType[vertexCount + 0] = face.typeMask;
                        faceType[vertexCount + 1] = face.typeMask;
                        faceType[vertexCount + 2] = face.typeMask;
                        faceType[vertexCount + 3] = face.typeMask;

                        index[indexOffset + 0] = vertexCount + 0;
                        index[indexOffset + 1] = vertexCount + 3;
                        index[indexOffset + 2] = vertexCount + 2;
                        index[indexOffset + 3] = vertexCount + 2;
                        index[indexOffset + 4] = vertexCount + 1;
                        index[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;
                        vertexCount += 4;
                    }

                    // South
                    for(const face of mesh.south) {
                        if(face.cull && !showSouth) continue;

                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x0;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y0;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z0;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u0;
                        floatAttributes[floatAttributeOffset + 4] = face.v0;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 1;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$nnp + ao$n_p + ao$_np) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$nnp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x1;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y1;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z1;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u1;
                        floatAttributes[floatAttributeOffset + 4] = face.v1;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 1;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$npp + ao$n_p + ao$_pp) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$npp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x2;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y2;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z2;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u2;
                        floatAttributes[floatAttributeOffset + 4] = face.v2;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 1;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$ppp + ao$p_p + ao$_pp) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$ppp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x3;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y3;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z3;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u3;
                        floatAttributes[floatAttributeOffset + 4] = face.v3;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 1;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$pnp + ao$p_p + ao$_np) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$pnp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;

                        faceType[vertexCount + 0] = face.typeMask;
                        faceType[vertexCount + 1] = face.typeMask;
                        faceType[vertexCount + 2] = face.typeMask;
                        faceType[vertexCount + 3] = face.typeMask;

                        index[indexOffset + 0] = vertexCount + 0;
                        index[indexOffset + 1] = vertexCount + 3;
                        index[indexOffset + 2] = vertexCount + 2;
                        index[indexOffset + 3] = vertexCount + 2;
                        index[indexOffset + 4] = vertexCount + 1;
                        index[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;
                        vertexCount += 4;
                    }

                    // East
                    for(const face of mesh.east) {
                        if(face.cull && !showEast) continue;

                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x0;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y0;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z0;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u0;
                        floatAttributes[floatAttributeOffset + 4] = face.v0;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 1;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$pnp + ao$p_p + ao$pn_) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$pnp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x1;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y1;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z1;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u1;
                        floatAttributes[floatAttributeOffset + 4] = face.v1;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 1;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$ppp + ao$p_p + ao$pp_) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$ppp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x2;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y2;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z2;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u2;
                        floatAttributes[floatAttributeOffset + 4] = face.v2;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 1;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$ppn + ao$p_n + ao$pp_) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$ppn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x3;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y3;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z3;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u3;
                        floatAttributes[floatAttributeOffset + 4] = face.v3;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 1;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$pnn + ao$p_n + ao$pn_) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$pnn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;

                        faceType[vertexCount + 0] = face.typeMask;
                        faceType[vertexCount + 1] = face.typeMask;
                        faceType[vertexCount + 2] = face.typeMask;
                        faceType[vertexCount + 3] = face.typeMask;

                        index[indexOffset + 0] = vertexCount + 0;
                        index[indexOffset + 1] = vertexCount + 3;
                        index[indexOffset + 2] = vertexCount + 2;
                        index[indexOffset + 3] = vertexCount + 2;
                        index[indexOffset + 4] = vertexCount + 1;
                        index[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;
                        vertexCount += 4;
                    }

                    // West
                    for(const face of mesh.west) {
                        if(face.cull && !showWest) continue;

                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x0;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y0;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z0;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u0;
                        floatAttributes[floatAttributeOffset + 4] = face.v0;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = -1;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$nnn + ao$n_n + ao$nn_) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$nnn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x1;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y1;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z1;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u1;
                        floatAttributes[floatAttributeOffset + 4] = face.v1;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = -1;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$npn + ao$n_n + ao$np_) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$npn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x2;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y2;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z2;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u2;
                        floatAttributes[floatAttributeOffset + 4] = face.v2;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = -1;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$npp + ao$n_p + ao$np_) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$npp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x3;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y3;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z3;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u3;
                        floatAttributes[floatAttributeOffset + 4] = face.v3;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = -1;
                        floatAttributes[floatAttributeOffset + 6] = 0;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$nnp + ao$n_p + ao$nn_) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$nnp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;

                        faceType[vertexCount + 0] = face.typeMask;
                        faceType[vertexCount + 1] = face.typeMask;
                        faceType[vertexCount + 2] = face.typeMask;
                        faceType[vertexCount + 3] = face.typeMask;

                        index[indexOffset + 0] = vertexCount + 0;
                        index[indexOffset + 1] = vertexCount + 3;
                        index[indexOffset + 2] = vertexCount + 2;
                        index[indexOffset + 3] = vertexCount + 2;
                        index[indexOffset + 4] = vertexCount + 1;
                        index[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;
                        vertexCount += 4;
                    }

                    // Up
                    for(const face of mesh.up) {
                        if(face.cull && !showUp) continue;

                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x0;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y0;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z0;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u0;
                        floatAttributes[floatAttributeOffset + 4] = face.v0;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 1;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$npp + ao$np_ + ao$_pp) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$npp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x1;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y1;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z1;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u1;
                        floatAttributes[floatAttributeOffset + 4] = face.v1;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 1;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$npn + ao$np_ + ao$_pn) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$npn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x2;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y2;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z2;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u2;
                        floatAttributes[floatAttributeOffset + 4] = face.v2;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 1;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$ppn + ao$pp_ + ao$_pn) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$ppn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x3;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y3;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z3;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u3;
                        floatAttributes[floatAttributeOffset + 4] = face.v3;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = 1;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$ppp + ao$pp_ + ao$_pp) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$ppp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;

                        faceType[vertexCount + 0] = face.typeMask;
                        faceType[vertexCount + 1] = face.typeMask;
                        faceType[vertexCount + 2] = face.typeMask;
                        faceType[vertexCount + 3] = face.typeMask;

                        index[indexOffset + 0] = vertexCount + 0;
                        index[indexOffset + 1] = vertexCount + 3;
                        index[indexOffset + 2] = vertexCount + 2;
                        index[indexOffset + 3] = vertexCount + 2;
                        index[indexOffset + 4] = vertexCount + 1;
                        index[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;
                        vertexCount += 4;
                    }

                    // Down
                    for(const face of mesh.down) {
                        if(face.cull && !showDown) continue;

                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x0;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y0;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z0;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u0;
                        floatAttributes[floatAttributeOffset + 4] = face.v0;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = -1;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$nnn + ao$nn_ + ao$_nn) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$nnn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x1;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y1;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z1;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u1;
                        floatAttributes[floatAttributeOffset + 4] = face.v1;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = -1;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$nnp + ao$nn_ + ao$_np) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$nnp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x2;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y2;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z2;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u2;
                        floatAttributes[floatAttributeOffset + 4] = face.v2;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = -1;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$pnp + ao$pn_ + ao$_np) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$pnp[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;
                        


                        // pos
                        floatAttributes[floatAttributeOffset + 0] = x + face.x3;
                        floatAttributes[floatAttributeOffset + 1] = y + face.y3;
                        floatAttributes[floatAttributeOffset + 2] = z + face.z3;

                        // uv
                        floatAttributes[floatAttributeOffset + 3] = face.u3;
                        floatAttributes[floatAttributeOffset + 4] = face.v3;

                        // normal
                        floatAttributes[floatAttributeOffset + 5] = 0;
                        floatAttributes[floatAttributeOffset + 6] = -1;
                        floatAttributes[floatAttributeOffset + 7] = 0;

                        // ao
                        floatAttributes[floatAttributeOffset + 8] = (ao$pnn + ao$pn_ + ao$_nn) * face.aoReceiveWeight;

                        // light
                        for(let i = 0; i < lightChannelCount; i++) {
                            floatAttributes[floatAttributeOffset + 9 + i] = light$pnn[i]!;
                        }

                        floatAttributeOffset += floatAttributeStride;

                        faceType[vertexCount + 0] = face.typeMask;
                        faceType[vertexCount + 1] = face.typeMask;
                        faceType[vertexCount + 2] = face.typeMask;
                        faceType[vertexCount + 3] = face.typeMask;

                        index[indexOffset + 0] = vertexCount + 0;
                        index[indexOffset + 1] = vertexCount + 3;
                        index[indexOffset + 2] = vertexCount + 2;
                        index[indexOffset + 3] = vertexCount + 2;
                        index[indexOffset + 4] = vertexCount + 1;
                        index[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;
                        vertexCount += 4;
                    }
                }
            }
        }

        const geometry = new BufferGeometry();

        // Copy float data to Float32Array and make it an InterleavedBuffer
        const interleavedFloatAttributes = new InterleavedBuffer(
            floatAttributes.slice(0, floatAttributeOffset), 9 + lightChannelCount);

        // Copy face type data to Uint16Array and make it a Uint16BufferAttribute
        const faceTypeAttribute = new Uint16BufferAttribute(faceType.slice(0, vertexCount), 1);
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
        geometry.setIndex(new BufferAttribute(index.slice(0, indexOffset), 1));

        return geometry;
    }
}