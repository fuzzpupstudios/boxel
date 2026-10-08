import type { EventCursor } from "./eventSheet";

export abstract class EventParamGetter<T> {
    public abstract get(cursor: EventCursor): T;
}