import type { EventCursor, EventSheet } from "./eventSheet";

export type EventAction = (cursor: EventCursor) => void;