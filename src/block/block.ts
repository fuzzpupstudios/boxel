import type { Box3 } from "three";
import type { TileMesh } from "../rendering/chunkMesher";
import type { TileCollider } from "../entity/entity";

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
        public readonly model: TileMesh,
        public readonly collider: TileCollider
    ) {}
}
