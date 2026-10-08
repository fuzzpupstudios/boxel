import type { EventCursor, EventSheet } from "./eventSheet";

export abstract class EventAction {
    public constructor(
        protected readonly eventSheet: EventSheet
    ) {}
    public abstract run(cursor: EventCursor): void;
}