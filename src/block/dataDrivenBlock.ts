import { Box3, Vector3 } from "three";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { TileCollider } from "../entity/entity";
import { Block, BlockState } from "./block";
import { BlockModel } from "./blockModel";


export class DataDrivenBlock extends Block {
    public constructor(
        private readonly json: DataDrivenJson.Block
    ) {
        super();
    }
    private static parseJsonCollider(collider: DataDrivenJson.BlockStateCollider): TileCollider {
        return {
            hitboxes: collider.hitboxes.map(({ from, to }) => new Box3(
                new Vector3(...from),
                new Vector3(...to)
            ))
        }
    }

    protected override buildStates(): BlockState[] {
        const blockStates = new Array<BlockState>;

        for(const jsonState of this.json.states) {
            const model = BlockModel.parseJson(jsonState.model);
            const collider = DataDrivenBlock.parseJsonCollider(
                jsonState.collider ?? { hitboxes: [] })

            const blockState = new BlockState(model, collider);

            blockStates.push(blockState);
        }

        return blockStates;
    }
}