let wasmMemory: WebAssembly.Memory | undefined;
let nextAllocation = 0;

function alignTo(value: number, alignment = 16) {
	return (value + alignment - 1) & ~(alignment - 1);
}

function ensureMemory(size: number) {
	if (wasmMemory === undefined) {
		throw new Error("WASM memory is not initialized yet");
	}

	const requiredBytes = size;
	if (requiredBytes <= wasmMemory.buffer.byteLength) {
		return;
	}

	const currentBytes = wasmMemory.buffer.byteLength;
	const pagesNeeded = Math.ceil((requiredBytes - currentBytes) / 65536);
	wasmMemory.grow(pagesNeeded);
}

function allocate(size: number) {
	const allocationSize = Math.max(alignTo(size), 16);
	nextAllocation = alignTo(nextAllocation);
	const ptr = nextAllocation;
	nextAllocation += allocationSize;
	ensureMemory(nextAllocation);
	return ptr;
}

export function setWasmMemory(memory: WebAssembly.Memory) {
	wasmMemory = memory;
	nextAllocation = alignTo(memory.buffer.byteLength);
}

export function _Znwm(size: number) {
	return allocate(size);
}

export function malloc(size: number) {
	return allocate(size);
}

export function free(_ptr: number) {}

export function _ZdlPvm(_ptr: number, _size: number) {}

export function __cxa_atexit() {
	return 0;
}

export function __cxa_allocate_exception(size: number) {
	return allocate(size);
}

export function __cxa_throw(_ptr: number, _type: number, _destructor: number) {
	throw new Error("FastNoise2 threw a C++ exception inside the WASM module");
}

export function __cxa_pure_virtual() {
	throw new Error("FastNoise2 called a pure virtual function inside the WASM module");
}

export function __dynamic_cast(ptr: number) {
	return ptr;
}

export function _ZNSt3__25mutexD1Ev() {}

export function _ZNSt3__25mutex4lockEv() {}

export function _ZNSt3__25mutex6unlockEv() {}

export function _ZNSt3__25alignEmmRPvRm() {
	return 1;
}

export function _ZNSt20bad_array_new_lengthC1Ev() {}

export function _ZNSt20bad_array_new_lengthD1Ev() {}

export function _ZNSt12length_errorD1Ev() {}

export function _ZNSt11logic_errorC2EPKc() {}

export function _ZNSt3__217bad_function_callD1Ev() {}
