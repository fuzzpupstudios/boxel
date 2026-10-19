import { blockStateRegistry, getUnknownBlockState } from "../block/blockRegistry";
import { LightingChunk } from "../world/lighting/lightingGrid";
import type { VoxelChunk } from "../world/voxelGrid";
import type { World } from "../world/world";

export class TileCache {
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

export interface TileFace {
    x0: number; y0: number; z0: number;
    x1: number; y1: number; z1: number;
    x2: number; y2: number; z2: number;
    x3: number; y3: number; z3: number;
    u0: number; v0: number;
    u1: number; v1: number;
    u2: number; v2: number;
    u3: number; v3: number;
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

export class TileMeshCache {
    public readonly tileMeshes: Map<string, TileMesh>;
    public readonly tileMeshList: TileMesh[];
    public readonly skipRenderMeshes = new Set<string>;
    public readonly aoWeights: Float32Array;
    public readonly tileMeshIndices: Map<string, number>;
    public readonly defaultMesh: TileMesh;
    public readonly defaultIndex: number;

    public constructor() {
        // Optimize: memoize block models, indexed by their block state's tile id
        const blockStateIds = Array.from(blockStateRegistry.keys());
        this.tileMeshList = new Array;
        this.tileMeshIndices = new Map;
        this.tileMeshes = new Map;
        this.aoWeights = new Float32Array(blockStateIds.length);

        for(let meshIndex = 0; meshIndex < blockStateIds.length; meshIndex++) {
            const blockStateId = blockStateIds[meshIndex]!;

            const blockState = blockStateRegistry.get(blockStateId)!;
            this.tileMeshIndices.set(blockStateId, meshIndex);
            
            try {
                const compiledModel = blockState.model.compile();

                this.tileMeshList[meshIndex] = compiledModel;
                this.aoWeights[meshIndex] = compiledModel.aoCastWeight;
                this.tileMeshes.set(blockStateId, compiledModel);

                if(compiledModel.skipRender) {
                    this.skipRenderMeshes.add(blockStateId);
                }
            } catch(e) {
                throw new Error("Failed to compile block model " + blockState, { cause: e });
            }
        }

        const defaultIndex = this.tileMeshIndices.get(getUnknownBlockState().getFullId()) || 0;
        this.defaultMesh = this.tileMeshList[defaultIndex]!;
        this.defaultIndex = defaultIndex;
    }

    public getMeshFromBlockStateId(tile: string) {
        return this.tileMeshes.get(tile) || this.defaultMesh;
    }
    public getMeshFromTile(tile: number) {
        return this.tileMeshList[tile] || this.defaultMesh;
    }
}