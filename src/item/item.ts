import type { EventSheet } from "../events/eventSheet";

export abstract class Item {
    public constructor(
        public readonly texture: ImageBitmap,
        public readonly events: EventSheet,
        public readonly tags: Set<string>
    ) { }
}