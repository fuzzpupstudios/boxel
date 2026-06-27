import createFastNoise2Module, { type FastNoise2GeneratedModule } from "./generated/fastnoise2.js";

const BYTES_PER_FLOAT = Float32Array.BYTES_PER_ELEMENT;
export const FASTNOISE_FEATURE_SET_MAX = 0xFFFFFFFF;

export interface FastNoiseGrid2DOptions {
    xOffset: number;
    yOffset: number;
    xCount: number;
    yCount: number;
    xStepSize: number;
    yStepSize: number;
    seed: number;
}

export interface FastNoiseGrid3DOptions {
    xOffset: number;
    yOffset: number;
    zOffset: number;
    xCount: number;
    yCount: number;
    zCount: number;
    xStepSize: number;
    yStepSize: number;
    zStepSize: number;
    seed: number;
}

export interface FastNoiseGenerationResult {
    values: Float32Array;
    min: number;
    max: number;
}

let modulePromise: Promise<FastNoise2GeneratedModule> | null = null;
let loadedModule: FastNoise2GeneratedModule | null = null;

export async function preloadFastNoise2Module(): Promise<void> {
    modulePromise ??= createFastNoise2Module();
    loadedModule ??= await modulePromise;
}

function getLoadedFastNoise2Module(): FastNoise2GeneratedModule {
    if(loadedModule == null) {
        throw new Error("FastNoise2 module has not been preloaded. Load WASM assets before constructing generators.");
    }

    return loadedModule;
}

function expectTargetSize(target: Float32Array, expectedSize: number) {
    if(target.length !== expectedSize) {
        throw new RangeError(`Expected a Float32Array of length ${expectedSize}, received ${target.length}`);
    }
}

function getFloatHeapView(module: FastNoise2GeneratedModule): Float32Array {
    if(module.wasmMemory != null) {
        return new Float32Array(module.wasmMemory.buffer);
    }

    if(module.HEAPF32 != null) {
        return module.HEAPF32;
    }

    throw new Error("FastNoise2 module did not expose wasm memory views");
}

export class FastNoiseNode {
    public static fromEncodedNodeTree(encodedNodeTree: string, maxFeatureSet = FASTNOISE_FEATURE_SET_MAX): FastNoiseNode {
        const module = getLoadedFastNoise2Module();
        const encodedLength = module.lengthBytesUTF8(encodedNodeTree) + 1;
        const encodedPointer = module._malloc(encodedLength);

        try {
            module.stringToUTF8(encodedNodeTree, encodedPointer, encodedLength);
            const handle = module._boxel_fastnoise2_create_generator(encodedPointer, maxFeatureSet >>> 0);

            if(handle === 0) {
                throw new Error("FastNoise2 could not decode the encoded node tree");
            }

            return new FastNoiseNode(module, handle);
        } finally {
            module._free(encodedPointer);
        }
    }

    private scratchPointer = 0;
    private scratchCapacity = 0;
    private minMaxPointer: number;

    private constructor(
        private readonly module: FastNoise2GeneratedModule,
        private generatorHandle: number,
    ) {
        this.minMaxPointer = this.module._malloc(BYTES_PER_FLOAT * 2);
    }

    public destroy(): void {
        if(this.generatorHandle !== 0) {
            this.module._boxel_fastnoise2_destroy_generator(this.generatorHandle);
            this.generatorHandle = 0;
        }
        if(this.scratchPointer !== 0) {
            this.module._free(this.scratchPointer);
            this.scratchPointer = 0;
            this.scratchCapacity = 0;
        }
        if(this.minMaxPointer !== 0) {
            this.module._free(this.minMaxPointer);
            this.minMaxPointer = 0;
        }
    }

    public getActiveFeatureSet(): number {
        this.assertAlive();
        return this.module._boxel_fastnoise2_get_active_feature_set(this.generatorHandle) >>> 0;
    }

    public generateUniformGrid2D(
        xOffset: number, yOffset: number,
        xCount: number, yCount: number,
        xStepSize: number, yStepSize: number,
        seed: number, target = new Float32Array(xCount * yCount)
    ): FastNoiseGenerationResult {
        this.assertAlive();

        const cellCount = xCount * yCount;
        expectTargetSize(target, cellCount);

        const outputPointer = this.ensureScratch(cellCount);
        const success = this.module._boxel_fastnoise2_generate_grid_2d(
            this.generatorHandle,
            outputPointer,
            xOffset,
            yOffset,
            xCount,
            yCount,
            xStepSize,
            yStepSize,
            seed,
            this.minMaxPointer,
        );

        if(success === 0) {
            throw new Error("FastNoise2 failed to generate a 2D noise grid");
        }

        target.set(this.readFloatSlice(outputPointer, cellCount));
        const [min, max] = this.readMinMax();

        return { values: target, min, max };
    }

    public generateUniformGrid3D(
        xOffset: number, yOffset: number, zOffset: number,
        xCount: number, yCount: number, zCount: number,
        xStepSize: number, yStepSize: number, zStepSize: number,
        seed: number, target = new Float32Array(xCount * yCount * zCount)
    ): FastNoiseGenerationResult {
        this.assertAlive();

        const cellCount = xCount * yCount * zCount;
        expectTargetSize(target, cellCount);

        const outputPointer = this.ensureScratch(cellCount);
        const success = this.module._boxel_fastnoise2_generate_grid_3d(
            this.generatorHandle,
            outputPointer,
            xOffset,
            yOffset,
            zOffset,
            xCount,
            yCount,
            zCount,
            xStepSize,
            yStepSize,
            zStepSize,
            seed,
            this.minMaxPointer,
        );

        if(success === 0) {
            throw new Error("FastNoise2 failed to generate a 3D noise grid");
        }

        target.set(this.readFloatSlice(outputPointer, cellCount));
        const [min, max] = this.readMinMax();

        return { values: target, min, max };
    }

    private assertAlive(): void {
        if(this.generatorHandle === 0) {
            throw new Error("This FastNoise2 generator has already been destroyed");
        }
    }

    private ensureScratch(floatCount: number): number {
        if(floatCount <= this.scratchCapacity) {
            return this.scratchPointer;
        }

        if(this.scratchPointer !== 0) {
            this.module._free(this.scratchPointer);
        }

        this.scratchPointer = this.module._malloc(floatCount * BYTES_PER_FLOAT);
        this.scratchCapacity = floatCount;

        return this.scratchPointer;
    }

    private readFloatSlice(pointer: number, floatCount: number): Float32Array {
        const start = pointer / BYTES_PER_FLOAT;
        return getFloatHeapView(this.module).subarray(start, start + floatCount);
    }

    private readMinMax(): readonly [number, number] {
        const minMax = this.readFloatSlice(this.minMaxPointer, 2);
        return [minMax[0]!, minMax[1]!];
    }
}
