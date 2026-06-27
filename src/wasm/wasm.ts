import init, { FastNoise2 } from './pkg/boxel_wasm.js';
import { setWasmMemory } from './env';

export { FastNoise2 };

export async function initWasm() {
    const wasm = await init();
    setWasmMemory(wasm.memory);
}
