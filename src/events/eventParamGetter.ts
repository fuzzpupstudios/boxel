import type { EventCursor } from "./eventSheet";

export type EventParamGetter<T> = (cursor: EventCursor) => T;