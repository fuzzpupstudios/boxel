import { MinPriorityQueue } from "@datastructures-js/priority-queue";
import { Vector3 } from "three";
import type { Time } from "../time";
import { VoxelGrid } from "./voxelGrid";
import type { Chunk, World } from "./world";

export class ChunkLoader {
    public maxColumnGenerations = 1;
    public maxColumnLoads = 32;
    public maxChunkUnloads = 64;

    private readonly origin = new Vector3(0);
    private radius = 128;
    private needsUpdate: boolean = true;
    public readonly columnsToLoad = new Map<number, [ number, number, number ]>;
    public readonly chunksToHide = new Map<number, Chunk>;
    public readonly columnGenerationQueue = new MinPriorityQueue<[ number, number, number, number, number ]>((obj) => obj[0]);
    public readonly columnLoadQueue = new MinPriorityQueue<[ number, number, number, number, number ]>((obj) => obj[0]);
    private updateChunksCooldown: number = 0;
    private readonly frameTasks = new Array<Function>;

    constructor(
        private readonly world: World
    ) {}

    public updateChunksToHide() {
        if(this.world.renderer == null) return;
        
        const minX = (this.origin.x - this.radius - 15) >> 4;
        const maxX = (this.origin.x + this.radius + 31) >> 4;
        const minY = (this.origin.y - this.radius - 15) >> 4;
        const maxY = (this.origin.y + this.radius + 31) >> 4;
        const minZ = (this.origin.z - this.radius - 15) >> 4;
        const maxZ = (this.origin.z + this.radius + 31) >> 4;

        for(const chunk of this.world.renderer.renderedChunks.keys()) {
            if(
                chunk.x > minX && chunk.x < maxX &&
                chunk.y > minY && chunk.y < maxY &&
                chunk.z > minZ && chunk.z < maxZ
            ) continue;
            
            this.chunksToHide.set(chunk.key, chunk);
        }
    }

    public updateChunksToLoad() {
        if(this.world.renderer === null) return;

        const marker = this.origin;
        const originX = marker.x >> 4;
        const originY = marker.y >> 4;
        const originZ = marker.z >> 4;
        const minX = (marker.x - this.radius) >> 4;
        const maxX = (marker.x + this.radius) >> 4;
        const minY = (marker.y - this.radius) >> 4;
        const maxY = (marker.y + this.radius) >> 4;
        const minZ = (marker.z - this.radius) >> 4;
        const maxZ = (marker.z + this.radius) >> 4;

        const radiusSquare = (this.radius * this.radius) >> 8;

        for(let x = minX; x <= maxX; x++) {
            for(let z = minZ; z <= maxZ; z++) {
                for(let y = minY; y <= maxY; y++) {
                    const key = VoxelGrid.encodeChunkKey(x, y, z);
                    if(!this.world.tiles.chunks.has(key)) continue;
                    if(this.world.renderer.renderedChunkKeyList.has(key)) continue;

                    const distanceSquare =
                        (x - originX) * (x - originX) +
                        (y - originY) * (y - originY) +
                        (z - originZ) * (z - originZ);
                    
                    if(distanceSquare > radiusSquare) continue;

                    this.world.flagChunkForRender(x, y, z);
                }
            }
        }
    }

    public updateColumnsToLoad() {
        const marker = this.origin;
        const originX = marker.x >> 4;
        const originZ = marker.z >> 4;
        const minX = (marker.x - this.radius) >> 4;
        const maxX = (marker.x + this.radius) >> 4;
        const minY = (marker.y - 128) >> 7 << 3;
        const maxY = (marker.y + 128) >> 7 << 3;
        const minZ = (marker.z - this.radius) >> 4;
        const maxZ = (marker.z + this.radius) >> 4;

        const radiusSquare = (this.radius * this.radius) >> 8;

        for(let x = minX; x <= maxX; x++) {
            for(let z = minZ; z <= maxZ; z++) {
                for(let y = minY; y <= maxY; y += 8) {
                    const distanceSquare =
                        (x - originX) * (x - originX) +
                        (z - originZ) * (z - originZ);
                    
                    if(distanceSquare > radiusSquare) continue;

                    const key = VoxelGrid.encodeChunkKey(x, y, z);
                    if(this.columnsToLoad.has(key)) continue;
                    if(this.world.tiles.chunks.has(key)) continue;

                    this.columnsToLoad.set(key, [ x, y, z ]);
                }
            }
        }

        this.columnGenerationQueue.clear();
        this.columnLoadQueue.clear();
        for(const [key, [ x, y, z ]] of this.columnsToLoad.entries()) {
            const distanceSquare =
                ((x << 4) - this.origin.x) * ((x << 4) - this.origin.x) +
                ((y << 4) - this.origin.y) * ((y << 4) - this.origin.y) +
                ((z << 4) - this.origin.z) * ((z << 4) - this.origin.z);
            
            const item = [ distanceSquare, key, x, y, z ];
            if(this.world.persistentWorld?.hasChunk(x, y, z)) {
                this.columnLoadQueue.enqueue(<any>item);
            } else {
                this.columnGenerationQueue.enqueue(<any>item);
            }
        }
    }

    public moveOrigin(origin: Vector3) {
        if(
            this.origin.x >> 4 != origin.x >> 4 ||
            this.origin.y >> 4 != origin.y >> 4 ||
            this.origin.z >> 4 != origin.z >> 4
        ) {
            this.needsUpdate = true;
        }
        this.origin.copy(origin);
    }

    public setRadius(radius: number) {
        this.radius = radius;
        this.needsUpdate = true;
        this.columnsToLoad.clear();
        this.chunksToHide.clear();
        this.columnGenerationQueue.clear();
    }

    public getRadius() {
        return this.radius;
    }

    public update(time: Time) {
        if(this.needsUpdate) {
            this.frameTasks.push(() => this.updateColumnsToLoad());
            this.frameTasks.push(() => this.updateChunksToHide());
            this.frameTasks.push(() => this.updateChunksToLoad());
            this.needsUpdate = false;
        }

        this.frameTasks.shift()?.();

        this.updateChunksCooldown -= time.deltaTime;

        if(this.updateChunksCooldown < 0) {
            this.updateChunksCooldown = 10;
            this.updateChunksToLoad();
        }

        
        const minX = (this.origin.x - this.radius - 15) >> 4;
        const maxX = (this.origin.x + this.radius + 31) >> 4;
        const minY = (this.origin.y - this.radius - 15) >> 6 << 2;
        const maxY = (this.origin.y + this.radius + 31) >> 6 << 2;
        const minZ = (this.origin.z - this.radius - 15) >> 4;
        const maxZ = (this.origin.z + this.radius + 31) >> 4;

        let max = Math.min(this.columnGenerationQueue.size(), this.maxColumnGenerations);
        for(let i = 0; i < max; i++) {
            const next = this.columnGenerationQueue.dequeue();

            if(next == null) break;

            const [ _, key, x, y, z ] = next;
            this.columnsToLoad.delete(key);

            if(
                x < minX || x > maxX ||
                y < minY || y > maxY ||
                z < minZ || z > maxZ
            ) {
                i--;
                continue;
            }

            let columnGenerated = false;
            for(let dy = 0; dy < 8; dy++) {
                if(this.world.tiles.getChunk(x, y + dy, z)) {
                    columnGenerated = true;
                    continue;
                }
            }

            if(!columnGenerated) {
                this.world.generateColumn(x, y, z);
            }
        }
        

        {
            const max = Math.min(this.columnLoadQueue.size(), this.maxColumnLoads);
            const positions: [number, number, number][] = [];

            for(let i = 0; i < max; i++) {
                const [ _, key, x, y, z ] = this.columnLoadQueue.dequeue()!;

                for(let dy = 0; dy < 8; dy++) {
                    if(!this.world.tiles.getChunk(x, y + dy, z)) {
                        positions.push([x, y + dy, z]);
                    }
                }
            }
                
            this.world.loadChunks(positions).then((chunks) => {
                for(const chunk of chunks) {
                    this.columnsToLoad.delete(chunk.key);
                }
            })
        }

        {
            const max = Math.min(this.chunksToHide.size, this.maxChunkUnloads);

            const iterator = this.chunksToHide.entries();
            for(let i = 0; i < max; i++) {
                const next = iterator.next();
                if(next.done) break;

                const [ key, chunk ] = next.value;

                this.world.hideChunk(chunk);
                this.chunksToHide.delete(key);
                this.columnsToLoad.delete(key);
            }
        }
    }
}