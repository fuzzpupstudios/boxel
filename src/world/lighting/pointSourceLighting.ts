import { Box3 } from "three";
import { LightingEngine } from "./lightingEngine";


export class PointSourceLighting extends LightingEngine {
    private getPropagatedIntensity(x: number, y: number, z: number) {
        const east = this.lightingGrid.get(x + 1, y, z);
        const west = this.lightingGrid.get(x - 1, y, z);
        const up = this.lightingGrid.get(x, y + 1, z);
        const down = this.lightingGrid.get(x, y - 1, z);
        const north = this.lightingGrid.get(x, y, z + 1);
        const south = this.lightingGrid.get(x, y, z - 1);

        const lightProperties = this.getLightProperties(x, y, z);
        const source = this.getSourceIntensity(lightProperties);
        const attenuation = this.getAttenuation(lightProperties);
        const propagated = Math.max(east, west, up, down, north, south) - attenuation;

        return Math.max(0, Math.min(15, Math.max(source, propagated)));
    }

    private enqueue(queue: number[], x: number, y: number, z: number) {
        queue.push(x, y, z);
    }

    public getLight(x: number, y: number, z: number) {
        return this.lightingGrid.get(x, y, z);
    }

    private enqueueNeighbors(queue: number[], x: number, y: number, z: number) {
        this.enqueue(queue, x + 1, y, z);
        this.enqueue(queue, x - 1, y, z);
        this.enqueue(queue, x, y + 1, z);
        this.enqueue(queue, x, y - 1, z);
        this.enqueue(queue, x, y, z + 1);
        this.enqueue(queue, x, y, z - 1);
    }

    private propagate(queue: number[], affectedExtent: Box3) {
        let minAffectedX = affectedExtent.min.x;
        let minAffectedY = affectedExtent.min.y;
        let minAffectedZ = affectedExtent.min.z;
        let maxAffectedX = affectedExtent.max.x;
        let maxAffectedY = affectedExtent.max.y;
        let maxAffectedZ = affectedExtent.max.z;
        let queueIndex = 0;

        while(queueIndex < queue.length && queue.length < 250000) {
            const tileX = queue[queueIndex++]!;
            const tileY = queue[queueIndex++]!;
            const tileZ = queue[queueIndex++]!;
            const current = this.lightingGrid.get(tileX, tileY, tileZ);
            const next = this.getPropagatedIntensity(tileX, tileY, tileZ);

            if(current === next) continue;

            if(tileX < minAffectedX) minAffectedX = tileX;
            if(tileY < minAffectedY) minAffectedY = tileY;
            if(tileZ < minAffectedZ) minAffectedZ = tileZ;
            if(tileX > maxAffectedX) maxAffectedX = tileX;
            if(tileY > maxAffectedY) maxAffectedY = tileY;
            if(tileZ > maxAffectedZ) maxAffectedZ = tileZ;

            this.lightingGrid.set(tileX, tileY, tileZ, next);
            this.enqueueNeighbors(queue, tileX, tileY, tileZ);
        }

        affectedExtent.min.set(minAffectedX, minAffectedY, minAffectedZ);
        affectedExtent.max.set(maxAffectedX, maxAffectedY, maxAffectedZ);
    }

    public override updateLight(x: number, y: number, z: number, affectedExtent: Box3) {
        const queue: number[] = [x, y, z];

        this.enqueueNeighbors(queue, x, y, z);

        this.propagate(queue, affectedExtent);
    }

    public override updateChunk(chunkX: number, chunkY: number, chunkZ: number, affectedExtent: Box3): void {
        const minX = chunkX << 4;
        const minY = chunkY << 4;
        const minZ = chunkZ << 4;
        const maxX = minX + 15;
        const maxY = minY + 15;
        const maxZ = minZ + 15;
        const queue: number[] = [];

        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    this.enqueue(queue, x, y, z);
                }
            }
        }

        affectedExtent.min.set(minX, minY, minZ);
        affectedExtent.max.set(maxX, maxY, maxZ);

        this.propagate(queue, affectedExtent);
    }
}