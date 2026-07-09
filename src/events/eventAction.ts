import type { EventCursor, EventSheet } from "./eventSheet";

export abstract class EventAction<EventParameters> {
    public constructor(
        protected readonly eventSheet: EventSheet,
        protected readonly args: EventParameters
    ) {}
    public abstract run(cursor: EventCursor): void;
}