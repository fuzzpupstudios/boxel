import type { EventCursor } from "./events/eventSheet";

export type RecursiveRecord<V> = { [ key: string ]: V | RecursiveRecord<V> }

export class EventError extends Error {
    public cursor?: EventCursor;

    constructor(message: string, options?: ErrorOptions & { cursor?: EventCursor }) {
        super(message, options);
        this.name = "EventError";
        this.cursor = options?.cursor;
    }
}

export class OrderedSet<T> {
    private readonly front = new Set<T>;
    private readonly back = new Set<T>;

    public push(item: T) {
        if(!this.front.has(item)) this.back.add(item);
    }

    public unshift(item: T) {
        this.back.delete(item);
        this.front.add(item);
    }

    public has(item: T) {
        return this.front.has(item) || this.back.has(item);
    }

    public delete(item: T) {
        this.front.delete(item) || this.back.delete(item);
    }

    public clear() {
        this.front.clear();
        this.back.clear();
    }

    public shift(): T | undefined {
        const set = this.front.size > 0 ? this.front : this.back;
        const result = set.values().next();
        if(result.done) return;

        set.delete(result.value);
        return result.value;
    }

    public get size(): number {
        return this.front.size + this.back.size;
    }

    public *[Symbol.iterator]() {
        yield* this.front;
        yield* this.back;
    }
}