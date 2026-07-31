import type { TextureAtlasSlot } from "../data/textureAtlas";
import type { EventPredicate } from "../events/eventPredicate";
import type { EventSheet } from "../events/eventSheet";
import type { Block } from "./block";
import type { TileCollider } from "./collider";
import type { BlockModel } from "./model/blockModel";

export class BlockState {
    public constructor(
        public readonly block: Block,
        public readonly stateKey: string,
        public readonly model: BlockModel,
        public readonly events: EventSheet,
        public readonly canPlacePredicate: EventPredicate,
        public readonly collider: TileCollider,
        public readonly tags: Set<string>,
        public readonly emission: Map<string, number>,
        public readonly attenuation: Map<string, number>,
        public readonly pickBlockStateId: string,
        public readonly renderAsTexture: TextureAtlasSlot | null,
        public readonly destroyTime: number
    ) {
    }

    public getFullId() {
        return this.block.id + "[" + this.stateKey + "]";
    }

    public toString() {
        return `{BlockState block=${this.block} stateKey=${this.stateKey}}`;
    }
}