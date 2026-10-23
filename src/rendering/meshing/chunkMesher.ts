import type { ChunkGeometryData } from "./meshWorkerConfig";
import { TileCache, type MeshCache } from "./tileRendering";

export type ChunkMesher = (meshCache: MeshCache, tileCache: TileCache) => number;

export function createChunkMesher(
    geometryData: ChunkGeometryData
): ChunkMesher {
    const lightChannelCount = geometryData.lightFactors.length;

    const {
        positions,
        uvs,
        normals,
        aoFactors,
        lightFactors,
        faceTypes,
        indices
    } = geometryData;

    console.log(aoFactors);


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

    const light$nnn = new Uint8Array(lightChannelCount);
    const light$nnp = new Uint8Array(lightChannelCount);
    const light$npn = new Uint8Array(lightChannelCount);
    const light$npp = new Uint8Array(lightChannelCount);
    const light$pnn = new Uint8Array(lightChannelCount);
    const light$pnp = new Uint8Array(lightChannelCount);
    const light$ppn = new Uint8Array(lightChannelCount);
    const light$ppp = new Uint8Array(lightChannelCount);
    

    function vertex(
        x: number, y: number, z: number,
        u: number, v: number,
        nx: number, ny: number, nz: number,
        ao: number,
        light: Uint8Array,
        typeMask: number
    ) {
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

    return function mesh(meshCache: MeshCache, tileCache: TileCache) {
        positionOffset = 0;
        uvOffset = 0;
        normalOffset = 0;
        aoFactorOffset = 0;
        lightFactorOffset = 0;
        indexOffset = 0;
        vertexCount = 0;

        for(let x = 0; x < 16; x++) {
            for(let y = 0; y < 16; y++) {
                for(let z = 0; z < 16; z++) {
                    const tile = tileCache.at(x, y, z);
                    const mesh = meshCache.getMeshFromTile(tile);

                    if(mesh.skipRender) continue;

                    const showNorth = !meshCache.getMeshFromTile(tileCache.at(x, y, z - 1)).occludeSouth;
                    const showSouth = !meshCache.getMeshFromTile(tileCache.at(x, y, z + 1)).occludeNorth;
                    const showEast = !meshCache.getMeshFromTile(tileCache.at(x + 1, y, z)).occludeWest;
                    const showWest = !meshCache.getMeshFromTile(tileCache.at(x - 1, y, z)).occludeEast;
                    const showUp = !meshCache.getMeshFromTile(tileCache.at(x, y + 1, z)).occludeDown;
                    const showDown = !meshCache.getMeshFromTile(tileCache.at(x, y - 1, z)).occludeUp;

                    // Optimize: when blocks on all sides cull this block, and this
                    // block doesn't render anything when all faces are culled, skip
                    // the rest of the checks (face iteration, etc.)
                    if(!(showNorth || showSouth || showEast || showWest || showUp || showDown)) {
                        if(!mesh.renderAnyWhenCulled) continue;
                    }

                    ao$nnn = tileCache.aoAt(x - 1, y - 1, z - 1);
                    ao$nn_ = tileCache.aoAt(x - 1, y - 1, z);
                    ao$nnp = tileCache.aoAt(x - 1, y - 1, z + 1);
                    ao$n_n = tileCache.aoAt(x - 1, y, z - 1);
                    
                    ao$n_p = tileCache.aoAt(x - 1, y, z + 1);
                    ao$npn = tileCache.aoAt(x - 1, y + 1, z - 1);
                    ao$np_ = tileCache.aoAt(x - 1, y + 1, z);
                    ao$npp = tileCache.aoAt(x - 1, y + 1, z + 1);

                    ao$_nn = tileCache.aoAt(x, y - 1, z - 1);
                    ao$_np = tileCache.aoAt(x, y - 1, z + 1);
                    
                    ao$_pn = tileCache.aoAt(x, y + 1, z - 1);
                    ao$_pp = tileCache.aoAt(x, y + 1, z + 1);

                    ao$pnn = tileCache.aoAt(x + 1, y - 1, z - 1);
                    ao$pn_ = tileCache.aoAt(x + 1, y - 1, z);
                    ao$pnp = tileCache.aoAt(x + 1, y - 1, z + 1);
                    ao$p_n = tileCache.aoAt(x + 1, y, z - 1);
                    
                    ao$p_p = tileCache.aoAt(x + 1, y, z + 1);
                    ao$ppn = tileCache.aoAt(x + 1, y + 1, z - 1);
                    ao$pp_ = tileCache.aoAt(x + 1, y + 1, z);
                    ao$ppp = tileCache.aoAt(x + 1, y + 1, z + 1);

                    tileCache.retrieveLightingAt(x, y, z, light$nnn);
                    tileCache.retrieveLightingAt(x, y, z + 1, light$nnp);
                    tileCache.retrieveLightingAt(x, y + 1, z, light$npn);
                    tileCache.retrieveLightingAt(x, y + 1, z + 1, light$npp);
                    tileCache.retrieveLightingAt(x + 1, y, z, light$pnn);
                    tileCache.retrieveLightingAt(x + 1, y, z + 1, light$pnp);
                    tileCache.retrieveLightingAt(x + 1, y + 1, z, light$ppn);
                    tileCache.retrieveLightingAt(x + 1, y + 1, z + 1, light$ppp);

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

        return vertexCount;
    }
}