import { AutoRegistry, KeyedRegistry } from "objectregistry";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { Block, BlockState } from "./block";
import { DataDrivenBlock } from "./dataDrivenBlock";

export const blockRegistry = new KeyedRegistry<Block, string>();

blockRegistry.register("air", new DataDrivenBlock(
    <DataDrivenJson.Block> <unknown> await import("./impl/air.json")));

blockRegistry.register("cobblestone", new DataDrivenBlock(
    <DataDrivenJson.Block> <unknown> await import("./impl/cobblestone.json")));

blockRegistry.register("axes", new DataDrivenBlock(
    <DataDrivenJson.Block> <unknown> await import("./impl/axes.json")));

blockRegistry.lock();


export const tileRegistry = new AutoRegistry<string>;
export const blockStateRegistry = new KeyedRegistry<BlockState, string>;
for(const block of blockRegistry.values()) {
    for(const state of block.states.values()) {
        tileRegistry.register(state.getFullId());
        blockStateRegistry.register(state.getFullId(), state);
    }
}

tileRegistry.lock();