import type { Assets } from "../data/assets";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { TextureAtlasSlot } from "../data/textureAtlas";
import { lightChannelRegistry } from "../world/lighting/lightChannelRegistry";
import { Block } from "./block";
import { BlockState } from "./blockState";
import { blockEntityTypeRegistry } from "./entity/blockEntityRegistry";
import { parseEvents, parseJsonCollider, parseModel, parsePredicate, parseTags } from "./jsonParseUtils";


export class DataDrivenBlock extends Block {
    public defaultState: BlockState = null!;
    public id: string = "default";

    public static parseJson(
        json: DataDrivenJson.Block,
        assets: Assets
    ) {
        const block = new DataDrivenBlock;

        let defaultState;

        block.id = json.id;

        if(json.blockEntity != null) {
            block.blockEntity = blockEntityTypeRegistry.get(json.blockEntity);
            if(block.blockEntity == null) {
                throw new ReferenceError("Cannot find block entity " + json.blockEntity);
            }
        }

        for(const [ stateKey, jsonState ] of Object.entries(json.states)) {
            if(json.defaultStateProperties != null) {
                this.applyDefaultProperties(structuredClone(json.defaultStateProperties), jsonState);
            }
            try {
                const blockState = this.parseState(block, stateKey, jsonState, assets);

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
    private static parseState(block: Block, stateKey: string, jsonState: DataDrivenJson.BlockState, assets: Assets) {
        const collider = parseJsonCollider(
            jsonState.collider ?? { hitboxes: [] });

        const tags = parseTags(jsonState.tags);

        let emission: Record<string, number>;
        if(jsonState.emission == null) {
            emission = {};
            for(const lightChannel of lightChannelRegistry.values()) {
                emission[lightChannel.id] = lightChannel.defaultEmission;
            }
        } else if(typeof jsonState.emission == "number") {
            emission = {};
            for(const lightChannelId of lightChannelRegistry.keys()) {
                emission[lightChannelId] = jsonState.emission;
            }
        } else {
            emission = jsonState.emission
        }

        let attenuation: Record<string, number>;
        if(jsonState.attenuation == null) {
            attenuation = {};
            for(const lightChannel of lightChannelRegistry.values()) {
                attenuation[lightChannel.id] = lightChannel.defaultAttenuation;
            }
        } else if(typeof jsonState.attenuation == "number") {
            attenuation = {};
            for(const lightChannelId of lightChannelRegistry.keys()) {
                attenuation[lightChannelId] = jsonState.attenuation;
            }
        } else {
            attenuation = jsonState.attenuation
        }

        const pickBlockState = jsonState.pickBlockState ?? stateKey;

        let renderAsTexture: TextureAtlasSlot | null = null;
        if(jsonState.renderAsTexture != null) {
            renderAsTexture = new TextureAtlasSlot(jsonState.renderAsTexture);
        }

        let model;
        try {
            model = parseModel(jsonState.model, assets);
        } catch(e) {
            throw new Error("Failed to parse model", { cause: e });
        }

        let eventSheet;
        try {
            eventSheet = parseEvents(jsonState.events, assets);
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
            new Map(Object.entries(emission)),
            new Map(Object.entries(attenuation)),
            pickBlockState.includes(":") ? pickBlockState : (block.id + "[" + pickBlockState + "]"),
            renderAsTexture,
            jsonState.destroyTime
        );
    }

    private static applyDefaultProperties(
        defaultProperties: NonNullable<DataDrivenJson.Block["defaultStateProperties"]>,
        jsonState: DataDrivenJson.BlockState
    ) {
        jsonState.attenuation ??= defaultProperties.attenuation!;
        jsonState.emission ??= defaultProperties.emission!;
        jsonState.canPlace ??= defaultProperties.canPlace!;
        jsonState.pickBlockState ??= defaultProperties.pickBlockState!;
        jsonState.renderAsTexture ??= defaultProperties.renderAsTexture!;

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

            if(jsonEvents.include == null) {
                jsonEvents.include = defaultEvents.include!;
            } else if(defaultEvents.include != null) {
                if(!(jsonEvents.include instanceof Array)) jsonEvents.include = [ jsonEvents.include ];

                if(defaultEvents.include instanceof Array) {
                    jsonEvents.include.unshift(...defaultEvents.include);
                } else {
                    jsonEvents.include.unshift(defaultEvents.include);
                }
            }


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
}