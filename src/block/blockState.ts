import type { TextureAtlasSlot } from "../data/textureAtlas";
import type { EventPredicate } from "../events/eventPredicate";
import type { EventSheet } from "../events/eventSheet";
import type { Block } from "./block";
import type { TileCollider } from "./collider";
import type { BlockModel } from "./model/blockModel";

export class BlockState {
    public readonly parameters: Map<string, string>;

    public static stateIdMatchesArgs(blockStateId: string, getParam: (key: string) => string | number | null | undefined) {
        let readingParams = false;

        let keyReadStart = 0;
        let keyReadEnd = 0;

        for(let i = 0; i < blockStateId.length; i++) {
            const char = blockStateId[i];

            if(!readingParams) {
                if(char === "[") {
                    readingParams = true;
                    keyReadStart = i + 1;
                }
            } else if(char === "]") {
                readingParams = false;
            } else if(char === "=") {
                keyReadEnd = i;
            } else if(char === ",") {
                const key = blockStateId.slice(keyReadStart, keyReadEnd);
                const value = blockStateId.slice(keyReadEnd + 1, i);

                const param = getParam(key);
                if(param != null && param !== value) return false;

                keyReadStart = i + 1;
                keyReadEnd = i + 1;
            }
        }

        return true;
    }

    public static setStateIdParams(blockStateId: string, getOverwrittenKey: (key: string) => string | number | null | undefined) {
        let newBlockStateId = "";

        let readingParams = false;
        let writtenNewValue = false;

        let lastSlice = 0;
        let keyReadStart = 0;

        for(let i = 0; i < blockStateId.length; i++) {
            const char = blockStateId[i];

            if(!readingParams) {
                if(char === "[") {
                    readingParams = true;
                    keyReadStart = i + 1;
                }
            } else if(char === "]") {
                readingParams = false;
                if(writtenNewValue) {
                    lastSlice = i;
                }
            } else if(char === "=") {
                const overwrittenKey = getOverwrittenKey(blockStateId.slice(keyReadStart, i));
                if(overwrittenKey != null) {
                    newBlockStateId += blockStateId.slice(lastSlice, i + 1) + overwrittenKey;
                    writtenNewValue = true;
                }
            } else if(char === ",") {
                if(writtenNewValue) {
                    lastSlice = i;
                }
                keyReadStart = i + 1;
                writtenNewValue = false;
            }
        }

        return newBlockStateId + blockStateId.slice(lastSlice);
    }

    public constructor(
        public readonly block: Block,
        public readonly stateKey: string,
        public readonly model: BlockModel,
        public readonly events: EventSheet,
        public readonly canPlacePredicate: EventPredicate,
        public readonly collider: TileCollider,
        public readonly tags: Set<string>,
        public readonly emission: Map<string, number>,
        public readonly attenuation: Map<string, number>,
        public readonly pickBlockStateId: string,
        public readonly renderAsTexture: TextureAtlasSlot | null,
        public readonly destroyTime: number
    ) {
        this.parameters = new Map;

        for(const pair of stateKey.split(",")) {
            const [ key, value ] = pair.split("=");

            if(key == null || value == null) continue;
            this.parameters.set(key, value ?? null);
        }
    }

    public getFullId() {
        return this.block.id + "[" + this.stateKey + "]";
    }

    public toString() {
        return `{BlockState block=${this.block} stateKey=${this.stateKey}}`;
    }
}