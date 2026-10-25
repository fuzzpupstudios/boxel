import type { EventCursor, EventSheet } from "./eventSheet";

export abstract class EventAction {
    public constructor(
        public readonly eventSheet: EventSheet
    ) {}
    public abstract run(cursor: EventCursor): void;
}