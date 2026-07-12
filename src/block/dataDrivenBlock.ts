import { Box3, Vector3 } from "three";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { TileCollider } from "../entity/entity";
import { Block, BlockState } from "./block";
import { BlockModel } from "./blockModel";
import { BoxelGame } from "../boxel";
import { DataDrivenEventSheet } from "../events/dataDrivenEventSheet";
import { ConstantPredicate, EventPredicate } from "../events/eventPredicate";
import { EventSheet } from "../events/eventSheet";
import type { Assets } from "../textures/assets";
import { parseEvents, parseJsonCollider, parseModel, parsePredicate } from "./jsonParseUtils";


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
            if(json.defaultStateProperties != null) {
                const defaultProperties: DataDrivenJson.BlockState =
                    JSON.parse(JSON.stringify(json.defaultStateProperties));

                jsonState.attenuation ??= defaultProperties.attenuation!;
                jsonState.emission ??= defaultProperties.emission!;
                jsonState.canPlace ??= defaultProperties.canPlace!;
                jsonState.pickBlockState ??= defaultProperties.pickBlockState!;

                if(jsonState.tags == null) {
                    jsonState.tags = defaultProperties.tags!;
                } else if(defaultProperties.tags != null) {
                    jsonState.tags.push(...defaultProperties.tags);
                }

                if(jsonState.collider == null) {
                    jsonState.collider = defaultProperties.collider!;
                } else if(defaultProperties.collider != null) {
                    jsonState.collider.hitboxes.push(...defaultProperties.collider.hitboxes);
                }

                if(jsonState.events == null) {
                    jsonState.events = defaultProperties.events!;
                } else if(defaultProperties.events != null) {
                    if(typeof jsonState.events == "string" || jsonState.events instanceof Array) {
                        jsonState.events = { include: jsonState.events };
                    }
                    if(typeof defaultProperties.events == "string" || defaultProperties.events instanceof Array) {
                        defaultProperties.events = { include: defaultProperties.events };
                    }

                    const jsonEvents = jsonState.events;
                    const defaultEvents = defaultProperties.events;

                    jsonEvents.include ??= defaultEvents.include!;


                    if(jsonEvents.triggers == null) {
                        jsonEvents.triggers = defaultEvents.triggers!;
                    } else if(defaultEvents.triggers != null) {
                        for(const triggerId of Object.keys(defaultEvents.triggers)) {
                            if(jsonEvents.triggers[triggerId] == null) {
                                jsonEvents.triggers[triggerId] = defaultEvents.triggers[triggerId]!;
                            } else if(defaultEvents.triggers[triggerId] != null) {
                                if(!(jsonEvents.triggers[triggerId] instanceof Array)) {
                                    jsonEvents.triggers[triggerId] = [ jsonEvents.triggers[triggerId] ];
                                }
                                if(!(defaultEvents.triggers[triggerId] instanceof Array)) {
                                    defaultEvents.triggers[triggerId] = [ defaultEvents.triggers[triggerId] ];
                                }

                                jsonEvents.triggers[triggerId].push(...<any>defaultEvents.triggers);
                            }
                        }
                    }
                }

                if(jsonState.model == null) {
                    jsonState.model = defaultProperties.model!;
                } else if(defaultProperties.model != null) {
                    if(typeof jsonState.model == "string") {
                        jsonState.model = { include: jsonState.model };
                    }
                    if(typeof defaultProperties.model == "string") {
                        defaultProperties.model = { include: defaultProperties.model };
                    }

                    const jsonModel = jsonState.model;
                    const defaultModel = defaultProperties.model;

                    jsonModel.include ??= [];
                    if(!(jsonModel.include instanceof Array)) {
                        jsonModel.include = [ jsonModel.include ];
                    }
                    if(defaultProperties.model.include instanceof Array) {
                        jsonModel.include.push(...defaultProperties.model.include);
                    } else if(defaultProperties.model.include != null) {
                        jsonModel.include.push(defaultProperties.model.include);
                    }
                    jsonModel.occlude ??= defaultModel.occlude!;

                    jsonModel.occludeNorth ??= defaultModel.occludeNorth!;
                    jsonModel.occludeEast ??= defaultModel.occludeEast!;
                    jsonModel.occludeSouth ??= defaultModel.occludeSouth!;
                    jsonModel.occludeWest ??= defaultModel.occludeWest!;
                    jsonModel.occludeDown ??= defaultModel.occludeDown!;
                    jsonModel.occludeUp ??= defaultModel.occludeUp!;

                    if(jsonModel.textures == null) {
                        jsonModel.textures = defaultModel.textures!;
                    } else if(defaultModel.textures != null) {
                        for(const [ key, value ] of Object.entries(defaultModel.textures)) {
                            jsonModel.textures[key] ??= value;
                        }
                    }

                    if(jsonModel.north == null) {
                        jsonModel.north = defaultModel.north!;
                    } else if(defaultModel.north != null) {
                        jsonModel.north.push(...defaultModel.north);
                    }
                    if(jsonModel.east == null) {
                        jsonModel.east = defaultModel.east!;
                    } else if(defaultModel.east != null) {
                        jsonModel.east.push(...defaultModel.east);
                    }
                    if(jsonModel.south == null) {
                        jsonModel.south = defaultModel.south!;
                    } else if(defaultModel.south != null) {
                        jsonModel.south.push(...defaultModel.south);
                    }
                    if(jsonModel.west == null) {
                        jsonModel.west = defaultModel.west!;
                    } else if(defaultModel.west != null) {
                        jsonModel.west.push(...defaultModel.west);
                    }
                    if(jsonModel.up == null) {
                        jsonModel.up = defaultModel.up!;
                    } else if(defaultModel.up != null) {
                        jsonModel.up.push(...defaultModel.up);
                    }
                    if(jsonModel.down == null) {
                        jsonModel.down = defaultModel.down!;
                    } else if(defaultModel.down != null) {
                        jsonModel.down.push(...defaultModel.down);
                    }
                }
            }
            try {
                const blockState = this.parseState(block, stateKey, jsonState);

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
    private static parseState(block: Block, stateKey: string, jsonState: DataDrivenJson.BlockState) {
        const game = BoxelGame.INSTANCE;


        const collider = parseJsonCollider(
            jsonState.collider ?? { hitboxes: [] });

        const tags = this.parseTags(jsonState.tags);

        const emission = jsonState.emission ?? [ 0, 0, 0, 0 ];
        if(emission.length != 4) throw new Error("Emission must have 4 numbers");

        const attenuation = jsonState.attenuation ?? [ 15, 15, 15, 15 ];
        if(attenuation.length != 4) throw new Error("Attenuation must have 4 numbers");

        const pickBlockState = jsonState.pickBlockState ?? stateKey;

        let model;
        try {
            model = parseModel(jsonState.model, game.assets);
        } catch(e) {
            throw new Error("Failed to parse model", { cause: e });
        }

        let eventSheet;
        try {
            eventSheet = parseEvents(jsonState.events, game.assets);
        } catch(e) {
            throw new Error("Failed to parse events " + jsonState.events, { cause: e });
        }
        
        let canPlacePredicate;
        try {
            canPlacePredicate = parsePredicate(jsonState.canPlace);
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
            attenuation,
            pickBlockState.includes(":") ? pickBlockState : (block.id + "[" + pickBlockState + "]")
        );
    }
    private static parseTags(jsonTags?: string[]) {
        const tags = new Set<string>;

        if(jsonTags != null) {
            for(const tag of jsonTags) tags.add(tag);
        }

        return tags;
    }
}