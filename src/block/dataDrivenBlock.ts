import { Box3, Vector3 } from "three";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { TileCollider } from "../entity/entity";
import { Block, BlockState } from "./block";
import { BlockModel } from "./blockModel";
import { BoxelGame } from "../boxel";
import { DataDrivenEventSheet } from "../events/dataDrivenEventSheet";
import { ConstantPredicate, EventPredicate } from "../events/eventPredicate";
import { EventSheet } from "../events/eventSheet";


export class DataDrivenBlock extends Block {
    public defaultState: BlockState = null!;
    public id: string = "default";

    public static parseJson(
        json: DataDrivenJson.Block
    ) {
        const block = new DataDrivenBlock;

        let defaultState;
        let defaultStateProperties
        if(json.defaultStateProperties != null) {
            defaultStateProperties = this.parseState(block, "", json.defaultStateProperties);
        }

        block.id = json.id;

        for(const [ stateKey, jsonState ] of Object.entries(json.states)) {
            try {
                const blockState = this.parseState(block, stateKey, jsonState, defaultStateProperties);

                block.states.set(stateKey, blockState);
                defaultState ??= blockState;
            } catch(e) {
                throw new Error("Failed to parse state " + stateKey, { cause: e });
            }
        }

        if(defaultState == null) {
            throw new ReferenceError("Default state could not be determined (are there states defined?)");
        } else {
            block.defaultState = block.states.get("default") ?? defaultState;
        }

        return block;
    }
    private static parseState(block: Block, stateKey: string, jsonState: DataDrivenJson.BlockState, defaultState?: BlockState) {
        const game = BoxelGame.INSTANCE;


        const collider = this.parseJsonCollider(
            jsonState.collider ?? { hitboxes: [] }, defaultState?.collider);

        const tags = this.parseTags(jsonState.tags, defaultState?.tags);

        const emission = jsonState.emission ?? defaultState?.emission ?? [ 0, 0, 0, 0 ];
        if(emission.length != 4) throw new Error("Emission must have 4 numbers");

        const attenuation = jsonState.attenuation ?? defaultState?.attenuation ?? [ 15, 15, 15, 15 ];
        if(attenuation.length != 4) throw new Error("Attenuation must have 4 numbers");

        
        let model;
        try {
            model = this.parseModel(jsonState.model, game, defaultState?.model);
        } catch(e) {
            throw new Error("Failed to parse model", { cause: e });
        }

        let eventSheet;
        try {
            eventSheet = this.parseEvents(jsonState.events, game, defaultState?.events);
        } catch(e) {
            throw new Error("Failed to parse events " + jsonState.events, { cause: e });
        }
        
        let canPlacePredicate;
        try {
            canPlacePredicate = this.parseCanPlacePredicate(jsonState.canPlace, defaultState?.canPlacePredicate);
        } catch(e) {
            throw new Error("Failed to parse canPlace predicate", { cause: e });
        }

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
    private static parseCanPlacePredicate(json?: DataDrivenJson.EventActionPredicateTree | boolean, defaultPredicate?: EventPredicate): EventPredicate {
        if(json == null && defaultPredicate != null) {
            return defaultPredicate;
        }

        json ??= true;

        if(typeof json == "boolean") {
            return new ConstantPredicate(json);
        } else {
            return DataDrivenEventSheet.parsePredicate(json ?? {});
        }
    }
    private static parseTags(jsonTags?: string[], defaultTags?: Set<string>) {
        const tags = new Set<string>;

        if(defaultTags != null) {
            for(const tag of defaultTags) {
                tags.add(tag);
            }
        }
        if(jsonTags != null) {
            for(const tag of jsonTags) tags.add(tag);
        }

        return tags;
    }
    private static parseEvents(events: string | DataDrivenJson.EventSheet | undefined, game: BoxelGame, defaultSheet?: EventSheet) {
        if(events == null) return new DataDrivenEventSheet;
        
        if(typeof events == "string") {
            const resolvedEvents = game.assets.eventSheetRegistry.get(events);
            if(resolvedEvents == null) throw new ReferenceError("Cannot resolve event sheet parent " + events);

            events = resolvedEvents;
        }

        return DataDrivenEventSheet.parseJson(events, game.assets, defaultSheet);
    }
    private static parseModel(model: string | DataDrivenJson.BlockStateModel, game: BoxelGame, defaultModel?: BlockModel) {
        if(typeof model == "string") {
            const resolvedModel = game.assets.blockModelRegistry.get(model);
            if(resolvedModel == null) throw new ReferenceError("Cannot resolve model parent " + model);

            model = resolvedModel;
        }

        return BlockModel.parseJson(model, game.assets, defaultModel);
    }
    private static parseJsonCollider(json: DataDrivenJson.BlockStateCollider, defaultCollider?: TileCollider): TileCollider {
        const collider = new TileCollider;

        if(defaultCollider != null) {
            for(const hitbox of defaultCollider.hitboxes) {
                collider.hitboxes.push(hitbox.clone());
            }
        }

        for(const hitbox of json.hitboxes) {
            collider.hitboxes.push(new Box3(
                new Vector3(...hitbox.from),
                new Vector3(...hitbox.to)
            ));
        }

        return collider;
    }
}