import { MathUtils } from "three";
import type { TileCollider } from "../entity/entity";
import type { BlockModel } from "./blockModel";
import type { EventSheet } from "../events/eventSheet";
import type { EventPredicate } from "../events/eventPredicate";
import type { BlockEntity, BlockEntityType } from "./entity/blockEntity";
import { lightChannelRegistry } from "../world/lighting/lightChannelRegistry";

export abstract class Block {
    public states: Map<string, BlockState> = new Map;
    public abstract defaultState: BlockState;
    public abstract id: string;
    public blockEntity: BlockEntityType | null = null;

    public toString() {
        return `{Block id=${this.id}}`
    }
}

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
        public readonly renderAsTexture: ImageBitmap | null
    ) {
        for(const [ id, channel ] of lightChannelRegistry.entries()) {
            this.emission.set(id, MathUtils.clamp(emission.get(id) ?? channel.defaultEmission, 0, 15));
            this.attenuation.set(id, MathUtils.clamp(attenuation.get(id) ?? channel.defaultAttenuation, 1, 15));
        }
    }

    public getFullId() {
        return this.block.id + "[" + this.stateKey + "]";
    }

    public toString() {
        return `{BlockState block=${this.block} stateKey=${this.stateKey}}`;
    }
}
