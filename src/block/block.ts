import { MathUtils } from "three";
import type { TileCollider } from "../entity/entity";
import type { BlockModel } from "./blockModel";
import type { EventSheet } from "../events/eventSheet";
import type { EventPredicate } from "../events/eventPredicate";

export abstract class Block {
    public states: Map<string, BlockState> = new Map;
    public abstract defaultState: BlockState;
    public abstract id: string;

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
        public readonly emission: [ number, number, number, number ],
        public readonly attenuation: [ number, number, number, number ],
        public readonly pickBlockStateId: string,
        public readonly renderAsTexture: ImageBitmap | null
    ) {
        for(let i = 0; i < 4; i++) {
            emission[i] = MathUtils.clamp(emission[i]!, 0, 15);
            attenuation[i] = MathUtils.clamp(attenuation[i]!, 1, 15);
        }
    }

    public getFullId() {
        return this.block.id + "[" + this.stateKey + "]";
    }

    public toString() {
        return `{BlockState block=${this.block} stateKey=${this.stateKey}}`;
    }
}
