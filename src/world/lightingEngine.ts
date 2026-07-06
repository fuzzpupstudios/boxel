import { Box3, Vector3 } from "three";
import { CascadingLighting } from "./lighting/cascadingLighting";
import type { Lighting } from "./lighting/lighting";
import { LightingGrid } from "./lighting/lightingGrid";
import { PointSourceLighting } from "./lighting/pointSourceLighting";
import type { World } from "./world";

export class LightingEngine {
    public readonly values = new LightingGrid;

    public readonly red: Lighting;
    public readonly green: Lighting;
    public readonly blue: Lighting;
    public readonly sun: Lighting;

    public constructor(
        public readonly world: World
    ) {
        this.red = new PointSourceLighting(this.values, world.tiles, 0);
        this.green = new PointSourceLighting(this.values, world.tiles, 1);
        this.blue = new PointSourceLighting(this.values, world.tiles, 2);
        this.sun = new CascadingLighting(this.values, world.tiles, 3);
    }

    public updateChunk(x: number, y: number, z: number, markDirty = true) {
        const affectedExtent = new Box3(new Vector3(x, y, z), new Vector3(x, y, z));

        this.sun.updateChunk(x, y, z, affectedExtent);
        this.red.updateChunk(x, y, z, affectedExtent);
        this.green.updateChunk(x, y, z, affectedExtent);
        this.blue.updateChunk(x, y, z, affectedExtent);
        
        if(markDirty) {
            this.world.markChunksDirty(
                affectedExtent.min.x >> 4,
                affectedExtent.min.y >> 4,
                affectedExtent.min.z >> 4,
                affectedExtent.max.x >> 4,
                affectedExtent.max.y >> 4,
                affectedExtent.max.z >> 4
            );
        }
    }

    public updateLight(x: number, y: number, z: number, priority: boolean = false) {
        const affectedExtent = new Box3(new Vector3(x, y, z), new Vector3(x, y, z));
        
        this.sun.updateLight(x, y, z, affectedExtent);
        this.red.updateLight(x, y, z, affectedExtent);
        this.green.updateLight(x, y, z, affectedExtent);
        this.blue.updateLight(x, y, z, affectedExtent);
        
        this.world.markChunksDirty(
            affectedExtent.min.x >> 4,
            affectedExtent.min.y >> 4,
            affectedExtent.min.z >> 4,
            affectedExtent.max.x >> 4,
            affectedExtent.max.y >> 4,
            affectedExtent.max.z >> 4,
            priority
        )
    }
}