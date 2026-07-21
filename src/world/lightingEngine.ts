import { Box3, Vector3 } from "three";
import { lightChannelRegistry } from "./lighting/lightChannelRegistry";
import type { Lighting } from "./lighting/lighting";
import { LightingGrid } from "./lighting/lightingGrid";
import type { World } from "./world";

export class LightingEngine {
    public readonly lightChannels = new Array<Lighting>;
    public readonly lightChannelMap = new Map<string, number>;

    public constructor(
        public readonly world: World
    ) {
        let index = 0;        
        for(const channelType of lightChannelRegistry.values()) {
            const grid = new LightingGrid;
            this.lightChannels.push(channelType.createLighting(grid, world.tiles));
            this.lightChannelMap.set(channelType.id, index);
            index++;
        }
    }

    public getChannel(id: string) {
        const index = this.lightChannelMap.get(id);
        return this.lightChannels[index!] ?? null;
    }

    public getChannelOrThrow(id: string) {
        const index = this.lightChannelMap.get(id);
        if(index == null) throw new ReferenceError("Lighting channel " + id + " does not exist");

        return this.lightChannels[index]!;
    }

    public updateChunk(x: number, y: number, z: number, markDirty = true) {
        const affectedExtent = new Box3(new Vector3(x, y, z), new Vector3(x, y, z));

        for(const channel of this.lightChannels) {
            channel.updateChunk(x, y, z, affectedExtent);
        }
        
        if(markDirty) {
            this.world.markChunksDirty(
                (affectedExtent.min.x - 1) >> 4,
                (affectedExtent.min.y - 1) >> 4,
                (affectedExtent.min.z - 1) >> 4,
                (affectedExtent.max.x + 1) >> 4,
                (affectedExtent.max.y + 1) >> 4,
                (affectedExtent.max.z + 1) >> 4
            );
        }
    }

    public updateLight(x: number, y: number, z: number, priority: boolean = false) {
        const affectedExtent = new Box3(new Vector3(x, y, z), new Vector3(x, y, z));
        
        for(const channel of this.lightChannels) {
            channel.updateLight(x, y, z, affectedExtent);
        }
        
        this.world.markChunksDirty(
            (affectedExtent.min.x - 1) >> 4,
            (affectedExtent.min.y - 1) >> 4,
            (affectedExtent.min.z - 1) >> 4,
            (affectedExtent.max.x + 1) >> 4,
            (affectedExtent.max.y + 1) >> 4,
            (affectedExtent.max.z + 1) >> 4,
            priority
        )
    }
}