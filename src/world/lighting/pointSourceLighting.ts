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

        return Math.max(0, Math.max(source, propagated));
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

        while(queueIndex < queue.length && queue.length < 300000) {
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

    // Chunks start fully unlit (every voxel reads 0 until set), so the only
    // voxels that can possibly change on a fresh relight are actual light
    // sources and voxels that can receive light bled in from an already-lit
    // neighbor chunk across the boundary. Seeding just those and letting
    // `propagate`'s existing BFS expansion do the rest produces the same
    // result as seeding all 4096 voxels, without wasting time evaluating
    // interior voxels that were always going to end up unchanged at 0.
    private enqueueLocalSources(
        queue: number[],
        chunkX: number, chunkY: number, chunkZ: number,
        minX: number, minY: number, minZ: number
    ) {
        const voxelChunk = this.tiles.getChunk(chunkX, chunkY, chunkZ);
        if(!voxelChunk) return;

        const palette = voxelChunk.palette;
        const paletteLength = palette.length;
        if(paletteLength === 0) return;

        // Resolve "does this block emit light" once per distinct block state
        // in the chunk's palette (typically a handful) instead of once per voxel.
        const emits = new Uint8Array(paletteLength);
        let anyEmitter = false;
        for(let i = 0; i < paletteLength; i++) {
            const properties = this.lightProperties.get(palette[i]!) ?? 1;
            if(this.getSourceIntensity(properties) > 0) {
                emits[i] = 1;
                anyEmitter = true;
            }
        }
        if(!anyEmitter) return;

        const localTiles = voxelChunk.tiles;
        for(let x = 0; x < 16; x++) {
            for(let y = 0; y < 16; y++) {
                for(let z = 0; z < 16; z++) {
                    const paletteIndex = localTiles[(x << 8) | (y << 4) | z]!;
                    if(emits[paletteIndex] === 1) {
                        this.enqueue(queue, minX + x, minY + y, minZ + z);
                    }
                }
            }
        }
    }

    private enqueueBoundaryFaces(
        queue: number[],
        minX: number, minY: number, minZ: number,
        maxX: number, maxY: number, maxZ: number
    ) {
        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                this.enqueue(queue, x, y, minZ);
                this.enqueue(queue, x, y, maxZ);
            }
        }
        for(let x = minX; x <= maxX; x++) {
            for(let z = minZ; z <= maxZ; z++) {
                this.enqueue(queue, x, minY, z);
                this.enqueue(queue, x, maxY, z);
            }
        }
        for(let y = minY; y <= maxY; y++) {
            for(let z = minZ; z <= maxZ; z++) {
                this.enqueue(queue, minX, y, z);
                this.enqueue(queue, maxX, y, z);
            }
        }
    }

    public override updateChunk(chunkX: number, chunkY: number, chunkZ: number, affectedExtent: Box3): void {
        const minX = chunkX << 4;
        const minY = chunkY << 4;
        const minZ = chunkZ << 4;
        const maxX = minX + 15;
        const maxY = minY + 15;
        const maxZ = minZ + 15;
        const queue: number[] = [];

        this.enqueueLocalSources(queue, chunkX, chunkY, chunkZ, minX, minY, minZ);
        this.enqueueBoundaryFaces(queue, minX, minY, minZ, maxX, maxY, maxZ);

        affectedExtent.min.set(minX, minY, minZ);
        affectedExtent.max.set(maxX, maxY, maxZ);

        this.propagate(queue, affectedExtent);
    }
}