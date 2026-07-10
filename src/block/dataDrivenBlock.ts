import { Box3, Vector3 } from "three";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { TileCollider } from "../entity/entity";
import { Block, BlockState } from "./block";
import { BlockModel } from "./blockModel";
import { BoxelGame } from "../boxel";
import { DataDrivenEventSheet } from "../events/dataDrivenEventSheet";
import { ConstantPredicate } from "../events/eventPredicate";


export class DataDrivenBlock extends Block {
    public defaultState: BlockState = null!;
    public id: string = "default";

    public static parseJson(
        json: DataDrivenJson.Block
    ) {
        const block = new DataDrivenBlock;

        let defaultState;

        block.id = json.id;

        for(const [ stateKey, jsonState ] of Object.entries(json.states)) {
            const blockState = this.parseState(block, stateKey, jsonState);

            block.states.set(stateKey, blockState);
            defaultState ??= blockState;
        }

        if(defaultState == null) {
            throw new ReferenceError("Default state could not be determined (are there states defined?)");
        } else {
            block.defaultState = block.states.get("default") ?? defaultState;
        }

        return block;
    }
    private static parseState(block: Block, stateKey: string, jsonState: DataDrivenJson.BlockState) {
        const game = BoxelGame.INSTANCE;
        const model = this.parseModel(jsonState.model, game);

        const collider = this.parseJsonCollider(
            jsonState.collider ?? { hitboxes: [] });

        const tags = new Set<string>(jsonState.tags ?? []);
        const emission = jsonState.emission ?? [ 0, 0, 0, 0 ];
        if(emission.length != 4) throw new Error("Emission must have 4 numbers");
        const attenuation = jsonState.attenuation ?? [ 15, 15, 15, 15 ];
        if(attenuation.length != 4) throw new Error("Attenuation must have 4 numbers");

        const eventSheet = DataDrivenEventSheet.parseJson(
            jsonState.events ?? { triggers: {} }, game.assets);
        
        const canPlacePredicate = typeof jsonState.canPlace == "boolean"
            ? new ConstantPredicate(jsonState.canPlace)
            : DataDrivenEventSheet.parsePredicate(jsonState.canPlace ?? {});

        return new BlockState(
            block, stateKey,
            model,
            eventSheet,
            canPlacePredicate,
            collider,
            tags,
            emission,
            attenuation
        );
    }
    private static parseModel(model: string | DataDrivenJson.BlockStateModel, game: BoxelGame) {
        if(typeof model == "string") {
            const resolvedModel = game.assets.blockModelRegistry.get(model);
            if(resolvedModel == null) throw new ReferenceError("Cannot resolve model parent " + model);

            model = resolvedModel;
        }
        return BlockModel.parseJson(model, game.assets);
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