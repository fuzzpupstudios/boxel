import { KeyedRegistry } from "objectregistry";
import type { VoxelGrid } from "../voxelGrid";
import type { LightingGrid } from "./lightingGrid";
import type { Lighting } from "./lighting";
import { PointSourceLighting } from "./pointSourceLighting";
import { CascadingLighting } from "./cascadingLighting";

export enum LightChannelType {
    POINT_SOURCE, CASCADING
}
export class LightChannel {
    public readonly defaultAttenuation = 15;
    public readonly defaultEmission = 0;

    public constructor(
        public readonly id: string,
        public readonly type: LightChannelType
    ) { }

    public createLighting(grid: LightingGrid, tiles: VoxelGrid): Lighting {
        switch(this.type) {
            case LightChannelType.POINT_SOURCE:
                return new PointSourceLighting(grid, tiles, this.id);
            case LightChannelType.CASCADING:
                return new CascadingLighting(grid, tiles, this.id);
        }
    }
}

export const lightChannelRegistry = new KeyedRegistry<LightChannel>;

lightChannelRegistry.register("base:red", new LightChannel("base:red", LightChannelType.POINT_SOURCE));
lightChannelRegistry.register("base:green", new LightChannel("base:green", LightChannelType.POINT_SOURCE));
lightChannelRegistry.register("base:blue", new LightChannel("base:blue", LightChannelType.POINT_SOURCE));
lightChannelRegistry.register("base:sky", new LightChannel("base:sky", LightChannelType.CASCADING));