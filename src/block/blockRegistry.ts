import { AutoRegistry, KeyedRegistry } from "objectregistry";
import { Block } from "./block";
import type { BlockState } from "./blockState";

export const blockRegistry = new KeyedRegistry<Block>();
export const tileRegistry = new AutoRegistry<string>;
export const blockStateRegistry = new KeyedRegistry<BlockState, string>;

let unknownBlockState: BlockState;

export function getUnknownBlockState() {
    return unknownBlockState;
}

export function registerAllBlockStates() {
    unknownBlockState = blockRegistry.get("base:axes")!.states.get("default")!;

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