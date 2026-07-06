import type { Box3 } from "three";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { VoxelGrid } from "../voxelGrid";
import type { LightingGrid } from "./lightingGrid";

export abstract class Lighting {
    protected readonly lightProperties = new Map<string, number>;
    protected readonly offset: number;

    public constructor(
        public readonly lightingGrid: LightingGrid,
        public readonly tiles: VoxelGrid,
        public readonly channel: number
    ) {
        this.offset = channel << 2;
        for(const [ blockStateId, blockState ] of blockStateRegistry.entries()) {
            const emission = blockState.emission[channel] ?? 0;
            const attenuation = blockState.attenuation[channel] ?? 1;
            this.lightProperties.set(blockStateId, (emission & 0xf) << 4 | attenuation & 0xf);
        }
    }

    protected getLightProperties(x: number, y: number, z: number) {
        const blockStateId = this.tiles.getBlockStateId(x, y, z);
        return this.lightProperties.get(blockStateId) ?? 1;
    }

    protected getAttenuation(lightProperties: number) {
        return lightProperties & 0xf;
    }

    protected getSourceIntensity(lightProperties: number) {
        return lightProperties >> 4 & 0xf;
    }

    public get(x: number, y: number, z: number) {
        return this.lightingGrid.get(x, y, z, this.offset);
    }
    public set(x: number, y: number, z: number, value: number) {
        return this.lightingGrid.set(x, y, z, value, this.offset);
    }

    public abstract updateLight(x: number, y: number, z: number, affectedExtent: Box3): void;
    public abstract updateChunk(chunkX: number, chunkY: number, chunkZ: number, affectedExtent: Box3): void;
}