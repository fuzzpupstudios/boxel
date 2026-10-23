import { Box3, BufferAttribute, BufferGeometry, Float32BufferAttribute, IntType, Mesh, Object3D, Uint16BufferAttribute, Uint8BufferAttribute, UnsignedByteType, Vector3, type NodeMaterial, type Scene } from "three/webgpu";
import type { Time } from "../../time";
import { encodeChunkKey as encodeBatchKey, type ChunkKey as BatchKey, type ChunkKey } from "../../world/keying";
import { Chunk, type World } from "../../world/world";
import { ChunkMeshDispatcher } from "./chunkMeshDispatcher";
import type { MeshCache } from "./tileRendering";
import { OrderedSet } from "../../utilTypes";
import { WorkerTerminationError } from "../../multithreading/error";


function mergeChunkGeometries(
    rootX: number, rootY: number, rootZ: number,
    chunkMeshes: Mesh[], lightChannelCount: number
): BufferGeometry {
    let vertexCount = 0;
    let indexCount = 0;
    for(const chunkMesh of chunkMeshes) {
        vertexCount += chunkMesh.geometry.attributes.position.count;
        indexCount += chunkMesh.geometry.index!.count;
    }

    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const normals = new Float32Array(vertexCount * 3);
    const aoFactors = new Float32Array(vertexCount);
    const lightFactors = [];
    const faceTypes = new Uint16Array(vertexCount);
    const indices = new Uint32Array(indexCount);

    for(let i = 0; i < lightChannelCount; i++) lightFactors.push(new Uint8Array(vertexCount));

    let vertexOffset = 0;
    let indexOffset = 0;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for(const chunkMesh of chunkMeshes) {
        const x = chunkMesh.position.x - rootX;
        const y = chunkMesh.position.y - rootY;
        const z = chunkMesh.position.z - rootZ;

        const attributes = chunkMesh.geometry.attributes;

        const position = attributes.position.array;
        for(let j = 0; j < position.length; j += 3) {
            positions[vertexOffset * 3 + j] = position[j] + x;
            positions[vertexOffset * 3 + j + 1] = position[j + 1] + y;
            positions[vertexOffset * 3 + j + 2] = position[j + 2] + z;
        }
        
        uvs.set(attributes.uv.array, vertexOffset * 2);
        normals.set(attributes.normal.array, vertexOffset * 3);
        aoFactors.set(attributes.aoFactor.array, vertexOffset);
        faceTypes.set(attributes.faceType.array, vertexOffset);

        const index = chunkMesh.geometry.index!.array;

        for(let j = 0; j < index.length; j++) {
            indices[indexOffset + j] = vertexOffset + index[j];
        }

        for(let j = 0; j < lightChannelCount; j++) {
            lightFactors[j].set(attributes["light" + j].array, vertexOffset);
        }

        indexOffset += index.length;
        vertexOffset += attributes.position.count;

        if(x < minX) minX = x;
        if(y < minY) minY = y;
        if(z < minZ) minZ = z;
        if(x > maxX) maxX = x;
        if(y > maxY) maxY = y;
        if(z > maxZ) maxZ = z;
    }

    const geometry = new BufferGeometry;
    
    const faceTypeAttribute = new Uint16BufferAttribute(faceTypes, 1);
    faceTypeAttribute.gpuType = IntType;
    
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geometry.setAttribute("aoFactor", new Float32BufferAttribute(aoFactors, 1));
    
    for(let i = 0; i < lightChannelCount; i++) {
        const attribute = new Uint8BufferAttribute(lightFactors[i], 1);
        attribute.gpuType = IntType;
        geometry.setAttribute("light" + i, attribute);
    }
    geometry.setAttribute("faceType", faceTypeAttribute);

    geometry.setIndex(new BufferAttribute(indices, 1));

    if(isFinite(minX)) {
        geometry.boundingBox = new Box3(
            new Vector3(minX, minY, minZ),
            new Vector3(maxX + 16, maxY + 16, maxZ + 16)
        );
    } else {
        geometry.boundingBox = new Box3;
    }

    return geometry;
}

export class BatchedChunkRegion {
    public readonly root = new Object3D;
    private batchedMesh: Mesh | null = null;
    private readonly chunkMeshes = new Map<Chunk, Mesh>;

    public readonly chunks = new Set<Chunk>;
    public readonly renderedChunks = new Set<Chunk>;

    public readonly dirtyChunks = new Set<Chunk>;
    public readonly waitingChunks = new Set<Chunk>;
    public readonly chunkX: number;
    public readonly chunkY: number;
    public readonly chunkZ: number;

    public lastUpdate: number = Infinity;
    public hibernated = false;

    private updateLock: Promise<any> | null = null;
    
    public constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number,
        public readonly key: BatchKey,
        public readonly renderer: BatchedChunkRenderer
    ) {
        this.chunkX = x * renderer.regionWidth;
        this.chunkY = y * renderer.regionHeight;
        this.chunkZ = z * renderer.regionWidth;

        this.root.matrixAutoUpdate = false;
    }

    public updateMatrices() {
        this.root.updateMatrix();
        this.root.matrixWorld.copy(this.root.matrix);
    }

    private makeBatched() {
        console.log("make region batched");

        const geometries = this.chunkMeshes.values().toArray();
        
        const geometry = mergeChunkGeometries(
            this.chunkX * 16, this.chunkY * 16, this.chunkZ * 16,
            geometries, this.renderer.world.lightingManager.getChannelCount()
        );
        const mesh = new Mesh(geometry, this.renderer.material);
        mesh.position.set(this.chunkX * 16, this.chunkY * 16, this.chunkZ * 16);
        mesh.matrixAutoUpdate = false;


        for(const chunkMesh of this.chunkMeshes.values()) {
            chunkMesh.removeFromParent();
        }

        this.batchedMesh = mesh;
        this.root.clear();
        this.root.add(mesh);

        mesh.updateMatrix();
        mesh.matrixWorld.copy(mesh.matrix);
    }

    private hibernate() {
        console.log("hibernate region");

        for(const mesh of this.chunkMeshes.values()) {
            mesh.geometry.dispose();
        }
        this.chunkMeshes.clear();
        this.hibernated = true;
    }

    private async unhibernate() {
        console.log("unhibernate region");
        await this.updateLock;

        if(this.batchedMesh) {
            this.batchedMesh.removeFromParent();
            this.batchedMesh.geometry.dispose();
            this.batchedMesh = null;
        }

        this.root.clear();

        const promises = new Array<Promise<void>>;
        for(const chunk of this.chunks) {
            promises.push(this.renderChunk(chunk));
        }
        this.updateLock = Promise.all(promises);
        await this.updateLock;
        this.updateLock = null;
        
        this.hibernated = false;
    }

    private makeIndividual() {
        console.log("make region individual");

        if(this.batchedMesh) {
            this.batchedMesh.removeFromParent();
            this.batchedMesh.geometry.dispose();
        }

        this.batchedMesh = null;
        this.root.clear();

        for(const mesh of this.chunkMeshes.values()) {
            this.root.add(mesh);
        }
    }

    public addChunk(chunk: Chunk) {
        this.chunks.add(chunk);
        this.updateChunk(chunk);
    }

    public updateChunk(chunk: Chunk) {
        this.dirtyChunks.add(chunk);
    }

    public deleteChunk(chunk: Chunk) {
        this.chunks.delete(chunk);
        this.dirtyChunks.delete(chunk);
        this.renderedChunks.delete(chunk);
        
        const mesh = this.chunkMeshes.get(chunk);

        if(mesh) {            
            mesh.removeFromParent();
            mesh.geometry.dispose();

            this.chunkMeshes.delete(chunk);
        }
    }

    public dispose() {
        if(this.batchedMesh) {
            this.batchedMesh.removeFromParent();
            this.batchedMesh.geometry.dispose();
        }
        for(const mesh of this.chunkMeshes.values()) {
            mesh.removeFromParent();
            mesh.geometry.dispose();
        }
        this.root.removeFromParent();

        this.chunkMeshes.clear();
        this.chunks.clear();
        this.renderedChunks.clear();
        this.dirtyChunks.clear();
    }

    private async renderChunk(chunk: Chunk) {
        const geometry = await this.renderer.chunkDispatcher.mesh(chunk.x, chunk.y, chunk.z);
        if(!this.chunks.has(chunk)) {
            geometry?.dispose();
            return;
        }

        let mesh = this.chunkMeshes.get(chunk);

        if(geometry) {
            if(mesh) {
                mesh.geometry.dispose();
                mesh.geometry = geometry;
            } else {
                mesh = new Mesh(geometry, this.renderer.material);
                mesh.position.set(chunk.x * 16, chunk.y * 16, chunk.z * 16);
                mesh.matrixAutoUpdate = false;

                this.chunkMeshes.set(chunk, mesh);
                this.root.add(mesh);

                mesh.updateMatrix();
                mesh.matrixWorld.copy(mesh.matrix);
            }

        } else {
            if(mesh) {
                mesh.geometry.dispose();
                mesh.removeFromParent();
            }

            this.chunkMeshes.delete(chunk);
        }

        this.renderedChunks.add(chunk);
    }

    public randomUpdate(time: Time) {
        if(
            !this.hibernated &&
            this.renderer.hibernation &&
            this.batchedMesh && time.seconds - this.lastUpdate > 60 &&
            this.renderedChunks.size === this.renderer.regionVolume
        ) {
            this.hibernate();
            return;
        }
        if(
            !this.batchedMesh &&
            time.seconds - this.lastUpdate > 8 &&
            !this.isUpdating()
        ) {
            this.makeBatched();
            return;
        }
    }

    public async update(time: Time) {
        await this.updateLock;

        if(this.dirtyChunks.size == 0) return;
        
        const promises = new Array<Promise<void>>;
        let changes = 0;

        const chunksToMesh = new Set<Chunk>(this.dirtyChunks);

        for(const chunk of this.waitingChunks) chunksToMesh.add(chunk);
        
        this.waitingChunks.clear();
        this.dirtyChunks.clear();

        for(const chunk of chunksToMesh) {
            if(this.renderedChunks.has(chunk) || chunk.isSurrounded()) {
                if(this.hibernated) {
                    await this.unhibernate();
                    changes++;
                    break;
                }

                if(this.batchedMesh) this.makeIndividual();
                
                promises.push(this.renderChunk(chunk));

                changes++;
            } else {
                this.waitingChunks.add(chunk);
            }
        }

        if(promises.length > 0) {
            this.updateLock = Promise.all(promises);
            await this.updateLock;
            this.updateLock = null;
        }

        if(changes > 0) {
            this.lastUpdate = time.seconds;
        }
    }

    public isUpdating() {
        return this.updateLock != null;
    }

    public hasChunks() {
        return this.chunks.size > 0;
    }
}

export class BatchedChunkRenderer {
    public readonly chunkDispatcher: ChunkMeshDispatcher;

    private readonly batchedRegions = new Map<BatchKey, BatchedChunkRegion>;

    public readonly dirtyRegions = new OrderedSet<BatchedChunkRegion>;

    public readonly renderedRegions = new Set<BatchedChunkRegion>;
    public readonly trackedChunks = new Map<ChunkKey, Chunk>;
    public readonly renderedChunks = new Map<ChunkKey, Chunk>;

    private settlePointer: MapIterator<BatchedChunkRegion> = this.batchedRegions.values();
    private updateLock: Promise<any> | null = null;

    public regionWidth = 2;
    public regionHeight = 8;
    public regionVolume = this.regionWidth * this.regionWidth * this.regionHeight;
    public hibernation = false;

    public constructor(
        public readonly world: World,
        public readonly meshCache: MeshCache,
        public readonly material: NodeMaterial,
        public readonly scene: Scene
    ) {
        this.chunkDispatcher = new ChunkMeshDispatcher(world, meshCache);
    }

    public async init() {
        for(let i = 0; i < 4; i++) {
            this.chunkDispatcher.createWorker();
        }
    }

    private getChunkRegion(chunk: Chunk) {
        const x = Math.floor(chunk.x / this.regionWidth);
        const y = Math.floor(chunk.y / this.regionHeight);
        const z = Math.floor(chunk.z / this.regionWidth);
        const key = encodeBatchKey(x, y, z);

        return this.batchedRegions.get(key);
    }

    private getOrCreateChunkRegion(chunk: Chunk) {
        const x = Math.floor(chunk.x / this.regionWidth);
        const y = Math.floor(chunk.y / this.regionHeight);
        const z = Math.floor(chunk.z / this.regionWidth);
        const key = encodeBatchKey(x, y, z);

        let region = this.batchedRegions.get(key);
        if(region) return region;

        region = new BatchedChunkRegion(x, y, z, key, this);
        this.batchedRegions.set(key, region);
        return region;
    }

    public markChunkDirty(chunk: Chunk, priority: boolean) {
        const region = this.getOrCreateChunkRegion(chunk);

        if(!this.dirtyRegions.has(region)) {
            if(priority) {
                this.dirtyRegions.unshift(region);
            } else {
                this.dirtyRegions.push(region);
            }
        }

        if(this.trackedChunks.has(chunk.key)) {
            region.updateChunk(chunk);
        } else {
            region.addChunk(chunk);

            this.trackedChunks.set(chunk.key, chunk);
        }
    }

    public deleteChunk(chunk: Chunk) {
        const region = this.getChunkRegion(chunk);
        if(region == null) return;

        region.deleteChunk(chunk);

        if(!region.hasChunks()) {
            this.deleteRegion(region);
        }

        this.trackedChunks.delete(chunk.key);
        this.renderedChunks.delete(chunk.key);
    }

    private deleteRegion(region: BatchedChunkRegion) {
        region.root.removeFromParent();
        region.dispose();
        this.dirtyRegions.delete(region);
        this.batchedRegions.delete(region.key);
        this.renderedRegions.delete(region);
    }

    private async updateRegion(time: Time, region: BatchedChunkRegion) {
        await region.update(time);
        if(!region.hasChunks()) return;

        if(region.renderedChunks.size > 0) {
            if(!this.renderedRegions.has(region)) {
                this.scene.add(region.root);
                region.updateMatrices();

                this.renderedRegions.add(region);
            }
        } else {
            region.root.removeFromParent();
            this.renderedRegions.delete(region);
        }
    }

    private settle(time: Time) {
        let quota = 10;
        let region: BatchedChunkRegion | undefined;

        while(quota > 0) {
            region = this.settlePointer.next().value;
            quota--;

            if(region) {
                region.randomUpdate(time);
            } else {
                this.settlePointer = this.batchedRegions.values();
                break;
            }
        }
    }

    public async render(time: Time, maxUpdates: number) {
        if(!this.isUpdating()) {
            const promises = new Array<Promise<void>>;

            for(let i = 0; i < maxUpdates; i++) {
                const region = this.dirtyRegions.shift();
                if(region == null) break;

                // await this.updateRegion(time, region);
                promises.push(this.updateRegion(time, region).then(() => {
                    for(const chunk of region.renderedChunks) {
                        if(this.trackedChunks.get(chunk.key) !== chunk) continue;
                        this.renderedChunks.set(chunk.key, chunk);
                    }
                }));
            }
            
            if(promises.length > 0) {
                this.updateLock = Promise.all(promises);
                try {
                    await this.updateLock;
                } catch(e) {
                    if(!(e instanceof WorkerTerminationError)) throw e;
                } finally {
                    this.updateLock = null;
                }
            }
        }

        this.settle(time);
    }

    public isUpdating() {
        return this.updateLock != null;
    }

    public dispose() {
        for(const region of this.batchedRegions.values()) {
            region.dispose();
        }
        
        this.batchedRegions.clear();
        this.dirtyRegions.clear();
        this.renderedRegions.clear();
        this.chunkDispatcher.dispose();
    }
}