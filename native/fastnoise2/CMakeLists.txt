cmake_minimum_required(VERSION 3.20)
project(boxel_fastnoise2_bridge LANGUAGES CXX)

if(NOT EMSCRIPTEN)
    message(FATAL_ERROR "This project must be configured with emcmake")
endif()

if(NOT DEFINED FASTNOISE2_SOURCE_DIR)
    message(FATAL_ERROR "FASTNOISE2_SOURCE_DIR must point to the FastNoise2 source checkout")
endif()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(FASTNOISE2_TOOLS OFF CACHE BOOL "" FORCE)
set(FASTNOISE2_TESTS OFF CACHE BOOL "" FORCE)
set(FASTNOISE2_UTILITY OFF CACHE BOOL "" FORCE)
set(FASTNOISE2_STANDALONE_PROJECT OFF CACHE BOOL "" FORCE)

add_compile_options(-O3 -msimd128 -mno-relaxed-simd)
add_link_options(-O3 -msimd128 -mno-relaxed-simd)

add_subdirectory("${FASTNOISE2_SOURCE_DIR}" "${CMAKE_BINARY_DIR}/fastnoise2")

add_executable(fastnoise2_bridge bridge.cpp)
target_link_libraries(fastnoise2_bridge PRIVATE FastNoise)

target_link_options(fastnoise2_bridge PRIVATE
    "SHELL:--no-entry"
    "SHELL:-sMODULARIZE=1"
    "SHELL:-sEXPORT_ES6=1"
    "SHELL:-sEXPORT_NAME=createFastNoise2Module"
    "SHELL:-sENVIRONMENT=web"
    "SHELL:-sALLOW_MEMORY_GROWTH=1"
    "SHELL:-sFILESYSTEM=0"
    "SHELL:-sSINGLE_FILE=1"
    "SHELL:-sWASM=1"
    "SHELL:-sEXPORTED_FUNCTIONS=[\"_malloc\",\"_free\",\"_boxel_fastnoise2_create_generator\",\"_boxel_fastnoise2_destroy_generator\",\"_boxel_fastnoise2_get_active_feature_set\",\"_boxel_fastnoise2_generate_grid_2d\",\"_boxel_fastnoise2_generate_grid_3d\"]"
    "SHELL:-sEXPORTED_RUNTIME_METHODS=[\"lengthBytesUTF8\",\"stringToUTF8\",\"HEAPF32\",\"wasmMemory\"]"
)

set_target_properties(fastnoise2_bridge PROPERTIES
    OUTPUT_NAME "fastnoise2"
    SUFFIX ".js"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/artifacts"
)
