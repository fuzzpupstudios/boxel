import { type blockStateRegistry } from "../../block/blockRegistry";
import { LightingChunk } from "../../world/lighting/lightingGrid";
import type { VoxelChunk } from "../../world/voxelGrid";
import type { World } from "../../world/world";
import { type TileCacheData } from "./meshWorkerConfig";

const emptyLightingChunk = new LightingChunk;

export class TileCache {
    private readonly lightChannelCount: number;

    public constructor(
        private readonly data: TileCacheData,
        private readonly meshCache: MeshCache
    ) {
        this.lightChannelCount = data.lightChannelCount;
    }

    public update(
        world: World,
        chunkX: number,
        chunkY: number,
        chunkZ: number,
        chunkTiles: VoxelChunk | null
    ) {
        const chunkOriginX = chunkX << 4;
        const chunkOriginY = chunkY << 4;
        const chunkOriginZ = chunkZ << 4;

        if(chunkTiles == null) return;

        const { meshCache, lightChannelCount, data: { meshes, haloAo, chunkMeshPalette, lighting } } = this;

        const lightChannels = world.lightingManager.lightChannels;

        const lightingChunks = [];
        for(const lightChannel of lightChannels) {
            lightingChunks.push(lightChannel.lightingGrid.getChunk(chunkX, chunkY, chunkZ) || emptyLightingChunk);
        }

        for(let i = 0; i < chunkMeshPalette.length; i++) {
            const blockStateId = chunkTiles.palette[i]!;
            chunkMeshPalette[i] = meshCache.tileMeshIndices.get(blockStateId) ?? meshCache.defaultIndex;
        }

        let tile: number;
        for(let x = -1, i = 0, k = 0; x < 17; x++) {
            for(let y = -1; y < 17; y++) {
                for(let z = -1; z < 17; z++, i++) {
                    if(x > -1 && x < 16 && y > -1 && y < 16 && z > -1 && z < 16) {
                        tile = chunkMeshPalette[chunkTiles.getTile(x, y, z)!]!;

                        for(let j = 0; j < lightChannelCount; j++, k++) {
                            lighting[k] = lightingChunks[j]!.get(x, y, z);
                        }
                    } else {
                        tile = meshCache.tileMeshIndices.get(
                            world.tiles.getBlockStateId(x + chunkOriginX, y + chunkOriginY, z + chunkOriginZ)
                        )!;

                        for(let j = 0; j < lightChannelCount; j++, k++) {
                            lighting[k] = lightChannels[j]!.get(
                                x + chunkOriginX,
                                y + chunkOriginY,
                                z + chunkOriginZ
                            );
                        }
                    }
                    meshes[i] = tile;
                    haloAo[i] = meshCache.aoWeights[tile] || 0;
                }
            }
        }
    }

    public at(x: number, y: number, z: number) {
        return this.data.meshes[(x + 1) * 324 + (y + 1) * 18 + (z + 1)]!;
    }
    public aoAt(x: number, y: number, z: number) {
        return this.data.haloAo[(x + 1) * 324 + (y + 1) * 18 + (z + 1)]!;
    }
    public retrieveLightingAt(x: number, y: number, z: number, out: Uint8Array) {
        const lightChannelCount = this.lightChannelCount;
        const lighting = this.data.lighting;

        const X = 324 * lightChannelCount;
        const Y = 18 * lightChannelCount;
        const Z = lightChannelCount;

        let j = (x + 1) * X + (y + 1) * Y + (z + 1) * Z;

        for(let i = 0; i < lightChannelCount; i++, j++) {
            out[i] = Math.max(
                lighting[j]!,
                lighting[j - Z]!,
                lighting[j - Y]!,
                lighting[j - Y - Z]!,
                lighting[j - X]!,
                lighting[j - X - Z]!,
                lighting[j - X - Y]!,
                lighting[j - X - Y - Z]!,
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

export interface SerializedTileMeshCache {
    tileMeshes: Record<string, TileMesh>;
    tileMeshList: TileMesh[];
    skipRenderMeshes: string[];
    aoWeights: number[];
    tileMeshIndices: Record<string, number>;
    defaultMesh: TileMesh;
    defaultIndex: number;
    defaultBlockStateId: string;
}

export class MeshCache {
    public static create(registry: typeof blockStateRegistry, defaultBlockStateId: string) {
        // Optimize: memoize block models, indexed by their block state's tile id
        const blockStateIds = Array.from(registry.keys());
        const tileMeshList = new Array;
        const tileMeshIndices = new Map;
        const tileMeshes = new Map;
        const aoWeights = new Float32Array(blockStateIds.length);
        const skipRenderMeshes = new Set<string>;

        for(let meshIndex = 0; meshIndex < blockStateIds.length; meshIndex++) {
            const blockStateId = blockStateIds[meshIndex]!;

            const blockState = registry.get(blockStateId)!;
            tileMeshIndices.set(blockStateId, meshIndex);
            
            try {
                const compiledModel = blockState.model.compile();

                tileMeshList[meshIndex] = compiledModel;
                aoWeights[meshIndex] = compiledModel.aoCastWeight;
                tileMeshes.set(blockStateId, compiledModel);

                if(compiledModel.skipRender) {
                    skipRenderMeshes.add(blockStateId);
                }
            } catch(e) {
                throw new Error("Failed to compile block model " + blockState, { cause: e });
            }
        }

        const defaultIndex = tileMeshIndices.get(defaultBlockStateId) || 0;
        const defaultMesh = tileMeshList[defaultIndex]!;

        return new MeshCache(
            tileMeshes,
            tileMeshList,
            skipRenderMeshes,
            aoWeights,
            tileMeshIndices,
            defaultMesh,
            defaultIndex,
            defaultBlockStateId
        );
    }

    public static deserialize(data: SerializedTileMeshCache) {
        return new MeshCache(
            new Map(Object.entries(data.tileMeshes)),
            data.tileMeshList,
            new Set(data.skipRenderMeshes),
            new Float32Array(data.aoWeights),
            new Map(Object.entries(data.tileMeshIndices)),
            data.defaultMesh,
            data.defaultIndex,
            data.defaultBlockStateId
        )
    }

    public serialize(): SerializedTileMeshCache {
        return {
            tileMeshes: Object.fromEntries(this.tileMeshes),
            tileMeshList: this.tileMeshList,
            skipRenderMeshes: Array.from(this.skipRenderMeshes),
            aoWeights: Array.from(this.aoWeights),
            tileMeshIndices: Object.fromEntries(this.tileMeshIndices),
            defaultMesh: this.defaultMesh,
            defaultIndex: this.defaultIndex,
            defaultBlockStateId: this.defaultBlockStateId
        }
    }

    private constructor(
        public readonly tileMeshes: Map<string, TileMesh>,
        public readonly tileMeshList: TileMesh[],
        public readonly skipRenderMeshes: Set<string>,
        public readonly aoWeights: Float32Array,
        public readonly tileMeshIndices: Map<string, number>,
        public readonly defaultMesh: TileMesh,
        public readonly defaultIndex: number,
        public readonly defaultBlockStateId: string
    ) {}

    public getMeshFromBlockStateId(tile: string) {
        return this.tileMeshes.get(tile) || this.defaultMesh;
    }
    public getMeshFromTile(tile: number) {
        return this.tileMeshList[tile] || this.defaultMesh;
    }
}