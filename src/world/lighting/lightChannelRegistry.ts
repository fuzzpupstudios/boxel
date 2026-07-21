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

lightChannelRegistry.register("base:red", new LightChannelType("base:red", new Color(0xff0000), false, LightingEngineType.POINT_SOURCE));
lightChannelRegistry.register("base:green", new LightChannelType("base:green", new Color(0x00ff00), false, LightingEngineType.POINT_SOURCE));
lightChannelRegistry.register("base:blue", new LightChannelType("base:blue", new Color(0x0000ff), false, LightingEngineType.POINT_SOURCE));
lightChannelRegistry.register("base:sky", new LightChannelType("base:sky", new Color(0xffffff), true, LightingEngineType.CASCADING));