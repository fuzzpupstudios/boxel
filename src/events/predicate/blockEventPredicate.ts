import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import n from "../eventVariableTypes";
import { isInteger, isString, parameter } from "../eventVariable";

export type BlockEventPredicateParameters = z.infer<typeof BlockEventPredicateParameters>;
export const BlockEventPredicateParameters = z.object({
    at: z.tuple([
        n.Integer,
        n.Integer,
        n.Integer,
    ]).default([ 0, 0, 0 ]),
    has_tag: n.String.optional(),
    is: n.String.optional(),
    params: z.record(z.string(), n.String).optional()
})

export class BlockEventPredicate extends EventPredicate {
    private readonly offsetX: n.Argument<number>;
    private readonly offsetY: n.Argument<number>;
    private readonly offsetZ: n.Argument<number>;
    private readonly blockHasTag?: n.Argument<string>;
    private readonly blockIs?: n.Argument<string>;
    private readonly stateParams = new Map<string, n.Argument<string>>;

    public constructor(args: unknown) {
        super();

        const parsed = BlockEventPredicateParameters.parse(args);
        this.offsetX = parameter(parsed.at[0], isInteger);
        this.offsetY = parameter(parsed.at[1], isInteger);
        this.offsetZ = parameter(parsed.at[2], isInteger);
        if(parsed.has_tag != null) this.blockHasTag = parameter(parsed.has_tag, isString);
        if(parsed.is != null) this.blockIs = parameter(parsed.is, isString);
        if(parsed.params != null) {
            for(const paramName of Object.keys(parsed.params)) {
                this.stateParams.set(paramName, parameter(parsed.params[paramName], isString));
            }
        }
    }
    public override test(cursor: EventCursor): boolean {
        const blockStateId = cursor.world.getBlockState(
            cursor.x + this.offsetX(cursor),
            cursor.y + this.offsetY(cursor),
            cursor.z + this.offsetZ(cursor)
        );

        if(this.blockIs) {
            if(blockStateId != this.blockIs(cursor)) return false;
        }

        const blockState = blockStateRegistry.get(blockStateId);

        if(this.stateParams.size > 0) {
            if(blockState == null) {
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

                        const param = this.stateParams.get(key);
                        if(param && param(cursor) != value) return false;

                        keyReadStart = i + 1;
                        keyReadEnd = i + 1;
                    }
                }
            } else {
                for(const [ param, value ] of this.stateParams) {
                    if(blockState.parameters.get(param) != value(cursor)) return false;
                }
            }
        }

        if(blockState && this.blockHasTag) {
            if(!blockState.tags.has(this.blockHasTag(cursor))) return false;
        }

        return true;
    }
}