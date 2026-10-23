import { Box3, Color, Vector3 } from "three";
import { type ChunkKey } from "../keying";
import type { World } from "../world";
import { lightChannelRegistry } from "./lightChannelRegistry";
import type { LightingEngine } from "./lightingEngine";
import { LightingGrid } from "./lightingGrid";

export class LightingManager {
    public readonly lightChannels = new Array<LightingEngine>;
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

    public getChannelCount() {
        return this.lightChannels.length;
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

    public getColorMap(x: number, y: number, z: number, outMap: Map<string, number>) {
        for(const channel of this.lightChannels) {
            outMap.set(channel.type.id, channel.get(x, y, z));
        }
    }

    public getColorAt(x: number, y: number, z: number, outColor: Color) {
        let r = 0;
        let g = 0;
        let b = 0;

        for(const channel of this.lightChannels) {
            r += channel.color.value.r * (channel.get(x, y, z) / 15) ** 3;
            g += channel.color.value.g * (channel.get(x, y, z) / 15) ** 3;
            b += channel.color.value.b * (channel.get(x, y, z) / 15) ** 3;
        }

        return outColor.set(
            Math.min(1, r),
            Math.min(1, g),
            Math.min(1, b)
        );
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
                (affectedExtent.max.z + 1) >> 4,
            
                true,   // render chunks
                true,   // save chunks
                false   // don't skip already rendered
            );
        }
    }

    public deleteChunk(key: ChunkKey) {
        for(const channel of this.lightChannels) {
            channel.tiles.chunks.delete(key);
        }
    }

    public updateLight(x: number, y: number, z: number) {
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
            
            true,   // render chunks
            true,   // save chunks
            false   // don't skip already rendered
        )
    }
}