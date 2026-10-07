import Alea from "alea";
import { type NoiseFunction3D, createNoise3D } from "simplex-noise";
import { MathUtils } from "three";
import { encodeChunkKey, type ChunkKey } from "../keying";
import { COLUMN_CHUNK_HEIGHT } from "../terrainGenerator";
import type { VoxelChunk, VoxelGrid } from "../voxelGrid";

export interface WormLayerOptions {
    seed: number;
    minLength: number;
    maxLength: number;
    minRadius: number;
    maxRadius: number;
    fill: string;
    offsetNoiseScale: number;
    radiusNoiseScale: number;
    verticalSquash: number;
    stepSize: number;
    count: number;
    chance: number;
    cacheSize: number;
}

export interface PerlinWorm {
    points: Float32Array; // [ [ x, y, z, radius ] ]
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
}

interface ChunkWorms {
    chunkX: number;
    chunkY: number;
    chunkZ: number;
    worms: PerlinWorm[];
}

const NO_WORMS: PerlinWorm[] = [];

export class WormLayer {
    private readonly chunkWormMap = new Map<ChunkKey, ChunkWorms>();
    private readonly chunkReachXZ: number;
    private readonly chunkReachY: number;
    private worldSeed: number | null = null;
    private noise: NoiseFunction3D | null = null;

    constructor(private readonly options: WormLayerOptions) {
        // Each step moves at most stepSize per axis, and there are ceil(length / stepSize) steps
        const maxTravel = options.maxLength + options.stepSize;
        this.chunkReachXZ = Math.ceil((maxTravel + options.maxRadius) / 16);
        this.chunkReachY = Math.ceil((maxTravel * options.verticalSquash + options.maxRadius) / 16);
    }

    public carve(tiles: VoxelGrid, seed: number, columnX: number, columnY: number, columnZ: number) {
        if(this.worldSeed !== seed) {
            this.worldSeed = seed;
            this.noise = createNoise3D(Alea(seed + this.options.seed));
            this.chunkWormMap.clear();
        }

        const minBlockX = columnX << 4;
        const minBlockY = columnY << 4;
        const minBlockZ = columnZ << 4;
        const maxBlockX = minBlockX + 15;
        const maxBlockY = minBlockY + COLUMN_CHUNK_HEIGHT * 16 - 1;
        const maxBlockZ = minBlockZ + 15;

        const chunks: VoxelChunk[] = [];
        const caveFillKeys: number[] = [];
        for(let chunkY = columnY; chunkY < columnY + COLUMN_CHUNK_HEIGHT; chunkY++) {
            chunks.push(tiles.getChunk(columnX, chunkY, columnZ)!);
            caveFillKeys.push(-1);
        }

        for(let chunkX = columnX - this.chunkReachXZ; chunkX <= columnX + this.chunkReachXZ; chunkX++) {
            for(let chunkY = columnY - this.chunkReachY; chunkY < columnY + COLUMN_CHUNK_HEIGHT + this.chunkReachY; chunkY++) {
                for(let chunkZ = columnZ - this.chunkReachXZ; chunkZ <= columnZ + this.chunkReachXZ; chunkZ++) {
                    const source = this.getSource(seed, chunkX, chunkY, chunkZ);

                    const originX = chunkX << 4;
                    const originY = chunkY << 4;
                    const originZ = chunkZ << 4;

                    for(const worm of source.worms) {
                        if(
                            worm.maxX < minBlockX || worm.minX > maxBlockX + 1 ||
                            worm.maxY < minBlockY || worm.minY > maxBlockY + 1 ||
                            worm.maxZ < minBlockZ || worm.minZ > maxBlockZ + 1
                        ) continue;

                        const points = worm.points;
                        for(let i = 0; i < points.length; i += 4) {
                            const wormX = points[i]! + originX;
                            const wormY = points[i + 1]! + originY;
                            const wormZ = points[i + 2]! + originZ;
                            const radius = points[i + 3]!;

                            if(
                                wormX < minBlockX - radius ||
                                wormX > maxBlockX + radius ||
                                wormY < minBlockY - radius ||
                                wormY > maxBlockY + radius ||
                                wormZ < minBlockZ - radius ||
                                wormZ > maxBlockZ + radius
                            ) continue;

                            const radiusSquared = radius * radius;

                            const minLoopX = Math.max(Math.floor(wormX - radius), minBlockX);
                            const maxLoopX = Math.min(Math.floor(wormX + radius), maxBlockX);
                            const minLoopY = Math.max(Math.floor(wormY - radius), minBlockY);
                            const maxLoopY = Math.min(Math.floor(wormY + radius), maxBlockY);
                            const minLoopZ = Math.max(Math.floor(wormZ - radius), minBlockZ);
                            const maxLoopZ = Math.min(Math.floor(wormZ + radius), maxBlockZ);

                            for(let y = minLoopY; y <= maxLoopY; y++) {
                                const chunkKey = (y >> 4) - columnY;
                                const chunk = chunks[chunkKey];
                                if(!chunk) continue;

                                let caveFillKey = caveFillKeys[chunkKey]!;
                                const dy2 = (y - wormY) * (y - wormY);

                                for(let x = minLoopX; x <= maxLoopX; x++) {
                                    const dx2 = (x - wormX) * (x - wormX);

                                    for(let z = minLoopZ; z <= maxLoopZ; z++) {
                                        if(dx2 + dy2 + (z - wormZ) * (z - wormZ) > radiusSquared) continue;

                                        if(caveFillKey === -1) {
                                            caveFillKey = caveFillKeys[chunkKey] = chunk.getPaletteValue(this.options.fill);
                                        }
                                        chunk.setTile(x & 0xf, y & 0xf, z & 0xf, caveFillKey);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private getSource(seed: number, chunkX: number, chunkY: number, chunkZ: number): ChunkWorms {
        const key = encodeChunkKey(chunkX, chunkY, chunkZ);
        let source = this.chunkWormMap.get(key);

        if(source != null) {
            // mark as most recently used
            this.chunkWormMap.delete(key);
            this.chunkWormMap.set(key, source);

            return source;
        }

        source = this.simulateSource(seed, chunkX, chunkY, chunkZ);
        this.chunkWormMap.set(key, source);

        if(this.chunkWormMap.size > this.options.cacheSize) {
            this.chunkWormMap.delete(this.chunkWormMap.keys().next().value!);
        }

        return source;
    }

    private simulateSource(seed: number, chunkX: number, chunkY: number, chunkZ: number): ChunkWorms {
        const options = this.options;
        const noise = this.noise!;
        const chunkWorms: ChunkWorms = { chunkX, chunkY, chunkZ, worms: NO_WORMS };

        const random = Alea(seed + ((chunkX & 0x7FF) << 21) | ((chunkY & 0x3FF) << 11) | (chunkZ & 0x7FF) + options.seed);
        if(random() > options.chance) return chunkWorms;

        chunkWorms.worms = [];

        const originX = chunkX << 4;
        const originY = chunkY << 4;
        const originZ = chunkZ << 4;

        for(let wormIndex = 0; wormIndex < options.count; wormIndex++) {
            let wormX = (random() * 16) + originX;
            let wormY = (random() * 16) + originY;
            let wormZ = (random() * 16) + originZ;
            const length = MathUtils.mapLinear(random(), 0, 1, options.minLength, options.maxLength);
            const stepCount = Math.ceil(length / options.stepSize);

            const worm: PerlinWorm = {
                points: new Float32Array(stepCount * 4),
                minX: Infinity, minY: Infinity, minZ: Infinity,
                maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity,
            };

            for(let step = 0; step < stepCount; step++) {
                wormX += noise(
                    (wormX * options.offsetNoiseScale),
                    (wormY * options.offsetNoiseScale),
                    (wormZ * options.offsetNoiseScale) + 1000
                ) * options.stepSize;
                wormY += noise(
                    (wormX * options.offsetNoiseScale) + 1000,
                    (wormY * options.offsetNoiseScale),
                    (wormZ * options.offsetNoiseScale)
                ) * options.verticalSquash * options.stepSize;
                wormZ += noise(
                    (wormX * options.offsetNoiseScale),
                    (wormY * options.offsetNoiseScale) + 1000,
                    (wormZ * options.offsetNoiseScale)
                ) * options.stepSize;

                const radius = MathUtils.mapLinear(noise(
                    (wormX * options.radiusNoiseScale) + 1000,
                    (wormY * options.radiusNoiseScale),
                    (wormZ * options.radiusNoiseScale)
                ), -1, 1, options.minRadius, options.maxRadius);

                const index = step * 4;
                worm.points[index] = wormX - originX;
                worm.points[index + 1] = wormY - originY;
                worm.points[index + 2] = wormZ - originZ;
                worm.points[index + 3] = radius;

                worm.minX = Math.min(worm.minX, wormX - radius);
                worm.minY = Math.min(worm.minY, wormY - radius);
                worm.minZ = Math.min(worm.minZ, wormZ - radius);
                worm.maxX = Math.max(worm.maxX, wormX + radius);
                worm.maxY = Math.max(worm.maxY, wormY + radius);
                worm.maxZ = Math.max(worm.maxZ, wormZ + radius);
            }

            chunkWorms.worms.push(worm);
        }

        return chunkWorms;
    }
}