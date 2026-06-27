import type { TileCollider } from "../entity/entity";
import type { BlockModel } from "./blockModel";

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
        public readonly collider: TileCollider,
    ) {}

    public getFullId() {
        return this.block.id + "[" + this.stateKey + "]";
    }

    public toString() {
        return `{BlockState block=${this.block} stateKey=${this.stateKey}}`;
    }
}
