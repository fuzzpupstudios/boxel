import type { TileCollider } from "../entity/entity";
import type { BlockModel } from "./blockModel";

export abstract class Block {
    private states: BlockState[] | null = null;

    protected abstract buildStates(): BlockState[];

    public getStates(): BlockState[] {
        if (this.states === null) {
            this.states = this.buildStates();
        }
        return this.states;
    }
}

export class BlockState {
    public constructor(
        public readonly model: BlockModel,
        public readonly collider: TileCollider
    ) {}
}
