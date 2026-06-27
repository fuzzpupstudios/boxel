export interface FastNoise2ModuleFactoryOptions {
    locateFile?: (path: string, prefix: string) => string;
}

export interface FastNoise2GeneratedModule {
    HEAPF32?: Float32Array;
    wasmMemory?: WebAssembly.Memory;
    _malloc(size: number): number;
    _free(pointer: number): void;
    lengthBytesUTF8(value: string): number;
    stringToUTF8(value: string, pointer: number, maxBytesToWrite: number): void;
    _boxel_fastnoise2_create_generator(encodedNodeTreePointer: number, maxFeatureSet: number): number;
    _boxel_fastnoise2_destroy_generator(generatorHandle: number): void;
    _boxel_fastnoise2_get_active_feature_set(generatorHandle: number): number;
    _boxel_fastnoise2_generate_grid_2d(
        generatorHandle: number,
        outputPointer: number,
        xOffset: number,
        yOffset: number,
        xCount: number,
        yCount: number,
        xStepSize: number,
        yStepSize: number,
        seed: number,
        outputMinMaxPointer: number,
    ): number;
    _boxel_fastnoise2_generate_grid_3d(
        generatorHandle: number,
        outputPointer: number,
        xOffset: number,
        yOffset: number,
        zOffset: number,
        xCount: number,
        yCount: number,
        zCount: number,
        xStepSize: number,
        yStepSize: number,
        zStepSize: number,
        seed: number,
        outputMinMaxPointer: number,
    ): number;
}

export default function createFastNoise2Module(options?: FastNoise2ModuleFactoryOptions): Promise<FastNoise2GeneratedModule>;
