import type { TextureAtlasSlot } from "../data/textureAtlas";
import type { EventSheet } from "../events/eventSheet";

export abstract class Item {
    public constructor(
        public readonly texture: TextureAtlasSlot,
        public readonly events: EventSheet,
        public readonly tags: Set<string>
    ) { }
}