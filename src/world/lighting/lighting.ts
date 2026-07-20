import { MathUtils, type Box3 } from "three";
import { uniform } from "three/tsl";
import type { Color, UniformNode } from "three/webgpu";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { VoxelGrid } from "../voxelGrid";
import type { LightChannelType } from "./lightChannelRegistry";
import type { LightingGrid } from "./lightingGrid";

const lerp = MathUtils.lerp;

export abstract class Lighting {
    public readonly color: UniformNode<"color", Color>;
    protected readonly lightProperties = new Map<string, number>;
    
    public constructor(
        public readonly lightingGrid: LightingGrid,
        public readonly tiles: VoxelGrid,
        public readonly channel: string,
        public readonly type: LightChannelType
    ) {
        for(const [ blockStateId, blockState ] of blockStateRegistry.entries()) {
            const emission = blockState.emission.get(channel) ?? 0;
            const attenuation = blockState.attenuation.get(channel) ?? 1;
            this.lightProperties.set(blockStateId, (emission & 0xf) << 4 | attenuation & 0xf);
        }

        this.color = uniform(type.defaultColor);
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

    public getPoint(x: number, y: number, z: number) {
        const minX = Math.floor(x);
        const maxX = Math.ceil(x);
        const minY = Math.floor(y);
        const maxY = Math.ceil(y);
        const minZ = Math.floor(z);
        const maxZ = Math.ceil(z);

        const uvX = x - minX;
        const uvY = y - minY;
        const uvZ = z - minZ;

        return lerp(
            lerp(
                lerp(
                    this.lightingGrid.get(minX, minY, minZ),
                    this.lightingGrid.get(maxX, minY, minZ),
                    uvX
                ),
                lerp(
                    this.lightingGrid.get(minX, maxY, minZ),
                    this.lightingGrid.get(maxX, maxY, minZ),
                    uvX
                ),
                uvY
            ),
            lerp(
                lerp(
                    this.lightingGrid.get(minX, minY, maxZ),
                    this.lightingGrid.get(maxX, minY, maxZ),
                    uvX
                ),
                lerp(
                    this.lightingGrid.get(minX, maxY, maxZ),
                    this.lightingGrid.get(maxX, maxY, maxZ),
                    uvX
                ),
                uvY
            ),
            uvZ
        )
    }

    public get(x: number, y: number, z: number) {
        return this.lightingGrid.get(x, y, z);
    }
    public set(x: number, y: number, z: number, value: number) {
        return this.lightingGrid.set(x, y, z, value);
    }

    public abstract updateLight(x: number, y: number, z: number, affectedExtent: Box3): void;
    public abstract updateChunk(chunkX: number, chunkY: number, chunkZ: number, affectedExtent: Box3): void;
}