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