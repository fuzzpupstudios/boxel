import { AutoRegistry, KeyedRegistry } from "objectregistry";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { Block, BlockState } from "./block";
import { DataDrivenBlock } from "./dataDrivenBlock";

export const blockRegistry = new KeyedRegistry<Block, string>();
export const tileRegistry = new AutoRegistry<string>;
export const blockStateRegistry = new KeyedRegistry<BlockState, string>;

export async function registerBlocks() {
    blockRegistry.register("air", new DataDrivenBlock(
        <DataDrivenJson.Block> <unknown> await import("./impl/air.json")));

    blockRegistry.register("cobblestone", new DataDrivenBlock(
        <DataDrivenJson.Block> <unknown> await import("./impl/cobblestone.json")));

    blockRegistry.register("axes", new DataDrivenBlock(
        <DataDrivenJson.Block> <unknown> await import("./impl/axes.json")));

    blockRegistry.register("dirt", new DataDrivenBlock(
        <DataDrivenJson.Block> <unknown> await import("./impl/dirt.json")));

    blockRegistry.register("grass", new DataDrivenBlock(
        <DataDrivenJson.Block> <unknown> await import("./impl/grass.json")));

    blockRegistry.lock();

    for(const block of blockRegistry.values()) {
        for(const state of block.states.values()) {
            try {
                tileRegistry.register(state.getFullId());
                blockStateRegistry.register(state.getFullId(), state);
            } catch(e) {
                throw new Error("Failed to register state " + state, { cause: e });
            }
        }
    }

    tileRegistry.lock();
}