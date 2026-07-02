import { Box3, Vector3 } from "three";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { TileCollider } from "../entity/entity";
import { Block, BlockState } from "./block";
import { BlockModel } from "./blockModel";
import { BoxelGame } from "../boxel";


export class DataDrivenBlock extends Block {
    public defaultState: BlockState;
    public id: string;

    public constructor(
        private readonly json: DataDrivenJson.Block
    ) {
        super();

        let defaultState;

        this.id = json.id;

        const game = BoxelGame.INSTANCE;

        for(const [ stateKey, jsonState ] of Object.entries(this.json.states)) {
            const model = BlockModel.parseJson(jsonState.model, game.assets);
            const collider = DataDrivenBlock.parseJsonCollider(
                jsonState.collider ?? { hitboxes: [] });

            const tags = new Set<string>(jsonState.tags ?? []);
            const blockState = new BlockState(this, stateKey, model, collider, tags);

            this.states.set(stateKey, blockState);
            defaultState ??= blockState;
        }

        if(defaultState == null) {
            throw new ReferenceError("Default state could not be determined (are there states defined?)");
        } else {
            this.defaultState = this.states.get("default") ?? defaultState;
        }
    }
    private static parseJsonCollider(collider: DataDrivenJson.BlockStateCollider): TileCollider {
        return {
            hitboxes: collider.hitboxes.map(({ from, to }) => new Box3(
                new Vector3(...from),
                new Vector3(...to)
            ))
        }
    }
}