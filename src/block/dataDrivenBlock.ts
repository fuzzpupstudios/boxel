import type { Assets } from "../data/assets";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { TextureAtlasSlot } from "../data/textureAtlas";
import { ConstantPredicate, type EventPredicate } from "../events/eventPredicate";
import { EventSheet } from "../events/eventSheet";
import { lightChannelRegistry } from "../world/lighting/lightChannelRegistry";
import { Block } from "./block";
import { BlockState } from "./blockState";
import { TileCollider } from "./collider";
import { blockEntityTypeRegistry } from "./entity/blockEntityRegistry";
import { parseEvents, parseJsonCollider, parseModel, parsePredicate, parseTags } from "./jsonParseUtils";
import { BlockModel } from "./model/blockModel";
import { blockTransformRegistry } from "./transform/blockTransformRegistry";

class PlaceholderBlock extends Block {
    public constructor(
        public readonly id: string
    ) {
        super();
    }
}

export class DataDrivenBlock extends Block {
    public id: string = "default";

    public static parseJson(
        json: DataDrivenJson.Block,
        assets: Assets
    ) {
        const block = new DataDrivenBlock;
        block.id = json.id;
        
        if(json.blockEntity != null) {
            block.blockEntity = blockEntityTypeRegistry.get(json.blockEntity);
            if(block.blockEntity == null) {
                throw new ReferenceError("Cannot find block entity " + json.blockEntity);
            }
        }
        
        for(const [ stateKey, jsonState ] of Object.entries(json.states)) {
            if(stateKey[0] == "#") continue;
            try {
                const blockState = this.parseState(block, stateKey, jsonState, assets);

                block.states.set(stateKey, blockState.compile());
            } catch(e) {
                throw new Error("Failed to parse state " + stateKey, { cause: e });
            }
        }

        return block;
    }
    private static parseState(
        block: Block,
        stateKey: string,
        jsonState: DataDrivenJson.BlockState,
        assets: Assets
    ) {
        const state = new DataDrivenBlockState(block, stateKey);

        let defaultState: DataDrivenBlockState | undefined;

        if(jsonState.parent != null) {
            let parentBlockId = block.id;
            let parentStateKey = jsonState.parent;
            
            const qualified = /^([^:]*:[^:]*)\[([^\]]*)\]$/.exec(jsonState.parent);
            if(qualified) {
                parentBlockId = qualified[1]!;
                parentStateKey = qualified[2]!;
            }

            const parentBlockJson = assets.blockRegistry.get(parentBlockId);
            if(parentBlockJson == null) throw new Error("Cannot find parent block id " + parentBlockId);

            const parentBlockStateJson = parentBlockJson.states[parentStateKey] ?? parentBlockJson.states["#" + parentStateKey];
            if(parentBlockStateJson == null) throw new Error("Cannot find parent state key " + parentStateKey);

            defaultState = this.parseState(
                new PlaceholderBlock(parentBlockId),
                parentStateKey,
                parentBlockStateJson,
                assets
            );
        }

        if(jsonState.collider != null) {    
            state.collider = parseJsonCollider(jsonState.collider, defaultState?.collider);
        } else if(defaultState?.collider != null) {
            state.collider = defaultState.collider.clone();
        }

        for(const tag of parseTags(jsonState.tags, defaultState?.tags)) {
            state.tags.add(tag);
        }

        if(defaultState != null) {
            for(const [ lightChannelId, value ] of defaultState.emission.entries()) {
                state.emission.set(lightChannelId, value);
            }
        }
        if(jsonState.emission != null) {
            if(typeof jsonState.emission == "number") {
                for(const lightChannelId of lightChannelRegistry.keys()) {
                    state.emission.set(lightChannelId, jsonState.emission);
                }
            } else {
                for(const [ lightChannelId, value ] of Object.entries(jsonState.emission)) {
                    state.emission.set(lightChannelId, value);
                }
            }
        }

        if(defaultState != null) {
            for(const [ lightChannelId, value ] of defaultState.attenuation.entries()) {
                state.attenuation.set(lightChannelId, value);
            }
        }
        if(jsonState.attenuation != null) {
            if(typeof jsonState.attenuation == "number") {
                for(const lightChannelId of lightChannelRegistry.keys()) {
                    state.attenuation.set(lightChannelId, jsonState.attenuation);
                }
            } else {
                for(const [ lightChannelId, value ] of Object.entries(jsonState.attenuation)) {
                    state.attenuation.set(lightChannelId, value);
                }
            }
        }

        if(jsonState.pickBlockState != null) {
            state.pickBlockStateId = jsonState.pickBlockState;
        } else if(defaultState?.pickBlockStateId != null) {
            state.pickBlockStateId = defaultState.pickBlockStateId;
        }
        
        if(jsonState.renderAsTexture != null) {
            state.renderAsTexture = new TextureAtlasSlot(jsonState.renderAsTexture);
        } else if(defaultState?.renderAsTexture != null) {
            state.renderAsTexture = defaultState.renderAsTexture.clone();
        }

        try {
            state.model = parseModel(jsonState.model, assets, defaultState?.model);
        } catch(e) {
            throw new Error("Failed to parse model", { cause: e });
        }

        try {
            state.events = parseEvents(jsonState.events, assets, defaultState?.events);
        } catch(e) {
            throw new Error("Failed to parse events " + jsonState.events, { cause: e });
        }
        
        if(jsonState.canPlace != null) {
            try {
                state.canPlacePredicate = parsePredicate(jsonState.canPlace);
            } catch(e) {
                throw new Error("Failed to parse canPlace predicate", { cause: e });
            }
        } else if(defaultState?.canPlacePredicate != null) {
            state.canPlacePredicate = defaultState.canPlacePredicate;
        }

        if(jsonState.destroyTime != null) {
            state.destroyTime = jsonState.destroyTime;
        } else if(defaultState?.destroyTime != null) {
            state.destroyTime = defaultState.destroyTime;
        }

        if(jsonState.transforms != null) {
            const transformList = jsonState.transforms instanceof Array ? jsonState.transforms : [ jsonState.transforms ];
            
            for(const transform of transformList) {
                for(const [ transformId, args ] of Object.entries(transform)) {
                    const TransformConstructor = blockTransformRegistry.get(transformId);

                    try {
                        if(TransformConstructor == null) throw new Error("Unknown transform");

                        const transformInstance = new TransformConstructor(args);
                        if(state.model != null) transformInstance.transformModel(state.model);
                        if(state.collider != null) transformInstance.transformCollider(state.collider);
                    } catch(e) {
                        throw new Error("Failed to apply block state transform " + transformId, { cause: e });
                    }
                }
            }
        }

        return state;
    }
}

export class DataDrivenBlockState {
    public model?: BlockModel;
    public events?: EventSheet;
    public canPlacePredicate?: EventPredicate;
    public collider?: TileCollider;
    public tags = new Set<string>;
    public emission = new Map<string, number>;
    public attenuation = new Map<string, number>;
    public pickBlockStateId?: string;
    public renderAsTexture?: TextureAtlasSlot;
    public destroyTime?: number;

    public constructor(
        public block: Block,
        public stateKey: string
    ) {}

    public compile() {
        const pickBlockState = this.pickBlockStateId ?? this.stateKey;

        const state = new BlockState(
            this.block,
            this.stateKey,
            this.model ?? new BlockModel,
            this.events ?? new EventSheet,
            this.canPlacePredicate ?? new ConstantPredicate(true),
            this.collider ?? new TileCollider,
            this.tags ?? new Set,
            this.emission ?? new Map,
            this.attenuation ?? new Map,
            /^[^:]+:[^\[]+\[[^\]]*\]$/.test(pickBlockState) ? pickBlockState : (this.block.id + "[" + pickBlockState + "]"),
            this.renderAsTexture ?? null,
            this.destroyTime ?? 1
        );

        return state;
    }
}