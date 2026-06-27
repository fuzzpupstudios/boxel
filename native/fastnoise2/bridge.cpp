#include <FastNoise/FastNoise_C.h>

extern "C" {
void* boxel_fastnoise2_create_generator(const char* encodedNodeTree, unsigned maxFeatureSet) {
    if(encodedNodeTree == nullptr) {
        return nullptr;
    }

    return fnNewFromEncodedNodeTree(encodedNodeTree, maxFeatureSet);
}

void boxel_fastnoise2_destroy_generator(void* generator) {
    fnDeleteNodeRef(generator);
}

unsigned boxel_fastnoise2_get_active_feature_set(const void* generator) {
    if(generator == nullptr) {
        return 0;
    }

    return fnGetActiveFeatureSet(generator);
}

int boxel_fastnoise2_generate_grid_2d(const void* generator, float* output,
    float xOffset, float yOffset,
    int xCount, int yCount,
    float xStepSize, float yStepSize,
    int seed,
    float* outputMinMax) {
    if(generator == nullptr || output == nullptr) {
        return 0;
    }

    fnGenUniformGrid2D(generator, output, xOffset, yOffset, xCount, yCount, xStepSize, yStepSize, seed, outputMinMax);
    return 1;
}

int boxel_fastnoise2_generate_grid_3d(const void* generator, float* output,
    float xOffset, float yOffset, float zOffset,
    int xCount, int yCount, int zCount,
    float xStepSize, float yStepSize, float zStepSize,
    int seed,
    float* outputMinMax) {
    if(generator == nullptr || output == nullptr) {
        return 0;
    }

    fnGenUniformGrid3D(generator, output, xOffset, yOffset, zOffset, xCount, yCount, zCount, xStepSize, yStepSize, zStepSize, seed, outputMinMax);
    return 1;
}
}
