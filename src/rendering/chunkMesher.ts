import { Box3, BufferAttribute, BufferGeometry, Float32BufferAttribute, IntType, Uint16BufferAttribute, Vector3 } from "three/webgpu";
import type { World } from "../world/world";
import { TileCache, type TileMeshCache } from "./tileRendering";

export class ChunkMesher {    
    private readonly tileCache: TileCache;
    private readonly lightChannelCount: number;
    private readonly positions: Float32Array;
    private readonly uvs: Float32Array;
    private readonly normals: Float32Array;
    private readonly aoFactors: Float32Array;
    private readonly lightFactors = new Array<Float32Array>;
    private readonly faceTypes: Uint16Array;
    private readonly indices: Uint32Array;

    public constructor(
        public readonly world: World,
        public readonly meshCache: TileMeshCache
    ) {
        this.tileCache = new TileCache(world, meshCache.aoWeights, meshCache.tileMeshIndices, meshCache.defaultIndex);
        this.lightChannelCount = world.lightingManager.lightChannels.length;

        // ~150 MB maximum mesh size (should be more than enough..?)
        const MAX_VERTEX_COUNT = 2 ** 22;

        // [ pos.x, pos.y, pos.z, uv.x, uv.y, normal.x, normal.y, normal.z, aoFactor, color*... ]
        this.positions = new Float32Array(MAX_VERTEX_COUNT * 3);
        this.uvs = new Float32Array(MAX_VERTEX_COUNT * 2);
        this.normals = new Float32Array(MAX_VERTEX_COUNT * 3);
        this.aoFactors = new Float32Array(MAX_VERTEX_COUNT);

        for(let i = 0; i < this.lightChannelCount; i++) {
            this.lightFactors.push(new Float32Array(MAX_VERTEX_COUNT));
        }

        // [ faceType ]
        // { <15x none> <lit> }
        this.faceTypes = new Uint16Array(MAX_VERTEX_COUNT);

        this.indices = new Uint32Array(MAX_VERTEX_COUNT * (6 / 4));
    }

    public mesh(chunkX: number, chunkY: number, chunkZ: number) {
        const chunkTiles = this.world.tiles.getChunk(chunkX, chunkY, chunkZ) || null;
        if(chunkTiles == null) return null;
        
        const meshCache = this.meshCache;

        if(chunkTiles.entireSingleTile && this.meshCache.skipRenderMeshes.has(chunkTiles.palette[0])) {
            return null;
        }
        
        // Optimize: use an 18x18x18 "halo" tile buffer
        // to cache tiles, so VoxelGrid#tileAt() isn't
        // called so frequently
        const tiles = this.tileCache;
        tiles.update(chunkX, chunkY, chunkZ, chunkTiles);

        const { positions, uvs, normals, aoFactors, lightFactors, faceTypes, indices } = this;

        const lightChannelCount = this.lightChannelCount;

        let positionOffset = 0;
        let uvOffset = 0;
        let normalOffset = 0;
        let aoFactorOffset = 0;
        let lightFactorOffset = 0;
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

        const vertex = (
            x: number, y: number, z: number,
            u: number, v: number,
            nx: number, ny: number, nz: number,
            ao: number,
            light: number[],
            typeMask: number
        ) => {
            // pos
            positions[positionOffset + 0] = x;
            positions[positionOffset + 1] = y;
            positions[positionOffset + 2] = z;

            // uv
            uvs[uvOffset + 0] = u;
            uvs[uvOffset + 1] = v;

            // normal
            normals[normalOffset + 0] = nx;
            normals[normalOffset + 1] = ny;
            normals[normalOffset + 2] = nz;

            // ao
            aoFactors[aoFactorOffset] = ao;

            // light
            for(let i = 0; i < lightChannelCount; i++) {
                lightFactors[i][lightFactorOffset] = light[i]!;
            }

            faceTypes[vertexCount] = typeMask;

            positionOffset += 3;
            uvOffset += 2;
            normalOffset += 3;
            aoFactorOffset++;
            lightFactorOffset++;
            vertexCount++;
        }

        for(let x = 0; x < 16; x++) {
            for(let y = 0; y < 16; y++) {
                for(let z = 0; z < 16; z++) {
                    const tile = tiles.at(x, y, z);
                    const mesh = meshCache.getMeshFromTile(tile);

                    if(mesh.skipRender) continue;

                    const showNorth = !meshCache.getMeshFromTile(tiles.at(x, y, z - 1)).occludeSouth;
                    const showSouth = !meshCache.getMeshFromTile(tiles.at(x, y, z + 1)).occludeNorth;
                    const showEast = !meshCache.getMeshFromTile(tiles.at(x + 1, y, z)).occludeWest;
                    const showWest = !meshCache.getMeshFromTile(tiles.at(x - 1, y, z)).occludeEast;
                    const showUp = !meshCache.getMeshFromTile(tiles.at(x, y + 1, z)).occludeDown;
                    const showDown = !meshCache.getMeshFromTile(tiles.at(x, y - 1, z)).occludeUp;

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

                        indices[indexOffset + 0] = vertexCount + 0;
                        indices[indexOffset + 1] = vertexCount + 3;
                        indices[indexOffset + 2] = vertexCount + 2;
                        indices[indexOffset + 3] = vertexCount + 2;
                        indices[indexOffset + 4] = vertexCount + 1;
                        indices[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;

                        vertex(
                            x + face.x0, y + face.y0, z + face.z0,
                            face.u0, face.v0,
                            0, 0, -1,
                            (ao$pnn + ao$p_n + ao$_nn) * face.aoReceiveWeight,
                            light$pnn,
                            face.typeMask
                        );

                        vertex(
                            x + face.x1, y + face.y1, z + face.z1,
                            face.u1, face.v1,
                            0, 0, -1,
                            (ao$ppn + ao$p_n + ao$_pn) * face.aoReceiveWeight,
                            light$ppn,
                            face.typeMask
                        );
                        vertex(
                            x + face.x2, y + face.y2, z + face.z2,
                            face.u2, face.v2,
                            0, 0, -1,
                            (ao$npn + ao$n_n + ao$_pn) * face.aoReceiveWeight,
                            light$npn,
                            face.typeMask
                        );

                        vertex(
                            x + face.x3, y + face.y3, z + face.z3,
                            face.u3, face.v3,
                            0, 0, -1,
                            (ao$nnn + ao$n_n + ao$_nn) * face.aoReceiveWeight,
                            light$nnn,
                            face.typeMask
                        );
                    }

                    // South
                    for(const face of mesh.south) {
                        if(face.cull && !showSouth) continue;

                        indices[indexOffset + 0] = vertexCount + 0;
                        indices[indexOffset + 1] = vertexCount + 3;
                        indices[indexOffset + 2] = vertexCount + 2;
                        indices[indexOffset + 3] = vertexCount + 2;
                        indices[indexOffset + 4] = vertexCount + 1;
                        indices[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;

                        vertex(
                            x + face.x0, y + face.y0, z + face.z0,
                            face.u0, face.v0,
                            0, 0, -1,
                            (ao$nnp + ao$n_p + ao$_np) * face.aoReceiveWeight,
                            light$nnp,
                            face.typeMask
                        );

                        vertex(
                            x + face.x1, y + face.y1, z + face.z1,
                            face.u1, face.v1,
                            0, 0, -1,
                            (ao$npp + ao$n_p + ao$_pp) * face.aoReceiveWeight,
                            light$npp,
                            face.typeMask
                        );
                        vertex(
                            x + face.x2, y + face.y2, z + face.z2,
                            face.u2, face.v2,
                            0, 0, -1,
                            (ao$ppp + ao$p_p + ao$_pp) * face.aoReceiveWeight,
                            light$ppp,
                            face.typeMask
                        );

                        vertex(
                            x + face.x3, y + face.y3, z + face.z3,
                            face.u3, face.v3,
                            0, 0, -1,
                            (ao$pnp + ao$p_p + ao$_np) * face.aoReceiveWeight,
                            light$pnp,
                            face.typeMask
                        );
                    }

                    // East
                    for(const face of mesh.east) {
                        if(face.cull && !showEast) continue;

                        indices[indexOffset + 0] = vertexCount + 0;
                        indices[indexOffset + 1] = vertexCount + 3;
                        indices[indexOffset + 2] = vertexCount + 2;
                        indices[indexOffset + 3] = vertexCount + 2;
                        indices[indexOffset + 4] = vertexCount + 1;
                        indices[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;

                        vertex(
                            x + face.x0, y + face.y0, z + face.z0,
                            face.u0, face.v0,
                            0, 0, -1,
                            (ao$pnp + ao$p_p + ao$pn_) * face.aoReceiveWeight,
                            light$pnp,
                            face.typeMask
                        );

                        vertex(
                            x + face.x1, y + face.y1, z + face.z1,
                            face.u1, face.v1,
                            0, 0, -1,
                            (ao$ppp + ao$p_p + ao$pp_) * face.aoReceiveWeight,
                            light$ppp,
                            face.typeMask
                        );
                        vertex(
                            x + face.x2, y + face.y2, z + face.z2,
                            face.u2, face.v2,
                            0, 0, -1,
                            (ao$ppn + ao$p_n + ao$pp_) * face.aoReceiveWeight,
                            light$ppn,
                            face.typeMask
                        );

                        vertex(
                            x + face.x3, y + face.y3, z + face.z3,
                            face.u3, face.v3,
                            0, 0, -1,
                            (ao$pnn + ao$p_n + ao$pn_) * face.aoReceiveWeight,
                            light$pnn,
                            face.typeMask
                        );
                    }

                    // West
                    for(const face of mesh.west) {
                        if(face.cull && !showWest) continue;

                        indices[indexOffset + 0] = vertexCount + 0;
                        indices[indexOffset + 1] = vertexCount + 3;
                        indices[indexOffset + 2] = vertexCount + 2;
                        indices[indexOffset + 3] = vertexCount + 2;
                        indices[indexOffset + 4] = vertexCount + 1;
                        indices[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;

                        vertex(
                            x + face.x0, y + face.y0, z + face.z0,
                            face.u0, face.v0,
                            0, 0, -1,
                            (ao$nnn + ao$n_n + ao$nn_) * face.aoReceiveWeight,
                            light$nnn,
                            face.typeMask
                        );

                        vertex(
                            x + face.x1, y + face.y1, z + face.z1,
                            face.u1, face.v1,
                            0, 0, -1,
                            (ao$npn + ao$n_n + ao$np_) * face.aoReceiveWeight,
                            light$npn,
                            face.typeMask
                        );
                        vertex(
                            x + face.x2, y + face.y2, z + face.z2,
                            face.u2, face.v2,
                            0, 0, -1,
                            (ao$npp + ao$n_p + ao$np_) * face.aoReceiveWeight,
                            light$npp,
                            face.typeMask
                        );

                        vertex(
                            x + face.x3, y + face.y3, z + face.z3,
                            face.u3, face.v3,
                            0, 0, -1,
                            (ao$nnp + ao$n_p + ao$nn_) * face.aoReceiveWeight,
                            light$nnp,
                            face.typeMask
                        );
                    }

                    // Up
                    for(const face of mesh.up) {
                        if(face.cull && !showUp) continue;

                        indices[indexOffset + 0] = vertexCount + 0;
                        indices[indexOffset + 1] = vertexCount + 3;
                        indices[indexOffset + 2] = vertexCount + 2;
                        indices[indexOffset + 3] = vertexCount + 2;
                        indices[indexOffset + 4] = vertexCount + 1;
                        indices[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;

                        vertex(
                            x + face.x0, y + face.y0, z + face.z0,
                            face.u0, face.v0,
                            0, 0, -1,
                            (ao$npp + ao$np_ + ao$_pp) * face.aoReceiveWeight,
                            light$npp,
                            face.typeMask
                        );

                        vertex(
                            x + face.x1, y + face.y1, z + face.z1,
                            face.u1, face.v1,
                            0, 0, -1,
                            (ao$npn + ao$np_ + ao$_pn) * face.aoReceiveWeight,
                            light$npn,
                            face.typeMask
                        );
                        vertex(
                            x + face.x2, y + face.y2, z + face.z2,
                            face.u2, face.v2,
                            0, 0, -1,
                            (ao$ppn + ao$pp_ + ao$_pn) * face.aoReceiveWeight,
                            light$ppn,
                            face.typeMask
                        );

                        vertex(
                            x + face.x3, y + face.y3, z + face.z3,
                            face.u3, face.v3,
                            0, 0, -1,
                            (ao$ppp + ao$pp_ + ao$_pp) * face.aoReceiveWeight,
                            light$ppp,
                            face.typeMask
                        );
                    }

                    // Down
                    for(const face of mesh.down) {
                        if(face.cull && !showDown) continue;

                        indices[indexOffset + 0] = vertexCount + 0;
                        indices[indexOffset + 1] = vertexCount + 3;
                        indices[indexOffset + 2] = vertexCount + 2;
                        indices[indexOffset + 3] = vertexCount + 2;
                        indices[indexOffset + 4] = vertexCount + 1;
                        indices[indexOffset + 5] = vertexCount + 0;

                        indexOffset += 6;

                        vertex(
                            x + face.x0, y + face.y0, z + face.z0,
                            face.u0, face.v0,
                            0, 0, -1,
                            (ao$nnn + ao$nn_ + ao$_nn) * face.aoReceiveWeight,
                            light$nnn,
                            face.typeMask
                        );

                        vertex(
                            x + face.x1, y + face.y1, z + face.z1,
                            face.u1, face.v1,
                            0, 0, -1,
                            (ao$nnp + ao$nn_ + ao$_np) * face.aoReceiveWeight,
                            light$nnp,
                            face.typeMask
                        );
                        vertex(
                            x + face.x2, y + face.y2, z + face.z2,
                            face.u2, face.v2,
                            0, 0, -1,
                            (ao$pnp + ao$pn_ + ao$_np) * face.aoReceiveWeight,
                            light$pnp,
                            face.typeMask
                        );

                        vertex(
                            x + face.x3, y + face.y3, z + face.z3,
                            face.u3, face.v3,
                            0, 0, -1,
                            (ao$pnn + ao$pn_ + ao$_nn) * face.aoReceiveWeight,
                            light$pnn,
                            face.typeMask
                        );
                    }
                }
            }
        }

        if(vertexCount == 0) return null;

        const geometry = new BufferGeometry();

        // Copy face type data to Uint16Array and make it a Uint16BufferAttribute
        const faceTypeAttribute = new Uint16BufferAttribute(faceTypes.subarray(0, vertexCount), 1);
        faceTypeAttribute.gpuType = IntType;
        
        // Use interleaved buffer data to set vertex attributes
        geometry.setAttribute("position", new Float32BufferAttribute(positions.subarray(0, vertexCount * 3), 3));
        geometry.setAttribute("uv", new Float32BufferAttribute(uvs.subarray(0, vertexCount * 2), 2));
        geometry.setAttribute("normal", new Float32BufferAttribute(normals.subarray(0, vertexCount * 3), 3));
        geometry.setAttribute("aoFactor", new Float32BufferAttribute(aoFactors.subarray(0, vertexCount), 1));
        
        for(let i = 0; i < lightChannelCount; i++) {
            geometry.setAttribute("light" + i, new Float32BufferAttribute(lightFactors[i].subarray(0, vertexCount), 1));
        }
        geometry.setAttribute("faceType", faceTypeAttribute);

        // Set indices
        geometry.setIndex(new BufferAttribute(indices.subarray(0, indexOffset), 1));

        geometry.boundingBox = new Box3(
            new Vector3(0, 0, 0),
            new Vector3(16, 16, 16),
        );

        return geometry;
    }
}