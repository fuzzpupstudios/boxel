import { KeyedRegistry } from "objectregistry";
import type { VoxelGrid } from "../voxelGrid";
import type { LightingGrid } from "./lightingGrid";
import type { Lighting } from "./lighting";
import { PointSourceLighting } from "./pointSourceLighting";
import { CascadingLighting } from "./cascadingLighting";
import { Color } from "three";

export enum LightingEngineType {
    POINT_SOURCE, CASCADING
}
export class LightChannelType {
    public readonly defaultAttenuation = 15;
    public readonly defaultEmission = 0;
    
    public constructor(
        public readonly id: string,
        public readonly defaultColor: Color,
        public readonly celestial: boolean,
        public readonly engineType: LightingEngineType
    ) { }

    public createLighting(grid: LightingGrid, tiles: VoxelGrid): Lighting {
        switch(this.engineType) {
            case LightingEngineType.POINT_SOURCE:
                return new PointSourceLighting(grid, tiles, this.id, this);
            case LightingEngineType.CASCADING:
                return new CascadingLighting(grid, tiles, this.id, this);
        }
    }
}

export const lightChannelRegistry = new KeyedRegistry<LightChannelType>;