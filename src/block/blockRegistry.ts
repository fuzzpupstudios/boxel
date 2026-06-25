import { AutoRegistry, KeyedRegistry } from "objectregistry";
import { DataDrivenBlock } from "./dataDrivenBlock";
import { Block } from "./block";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { TileMesh } from "../rendering/chunkMesher";

export const blockRegistry = new KeyedRegistry<Block, string>();

blockRegistry.register("air", new DataDrivenBlock(
    <DataDrivenJson.Block> <unknown> await import("./impl/air.json")));

blockRegistry.register("cobblestone", new DataDrivenBlock(
    <DataDrivenJson.Block> <unknown> await import("./impl/cobblestone.json")));

blockRegistry.register("axes", new DataDrivenBlock(
    <DataDrivenJson.Block> <unknown> await import("./impl/axes.json")));

blockRegistry.lock();


export const tileRegistry = new AutoRegistry<TileMesh>();
for(const block of blockRegistry.values()) {
    for(const state of block.getStates()) {
        tileRegistry.register(state.model);
    }
}

tileRegistry.lock();