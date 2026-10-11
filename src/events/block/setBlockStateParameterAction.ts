import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import n from "../eventVariableTypes";
import { isInteger, isPrimitive, parameter } from "../eventVariable";

export type SetBlockStateParameterActionParameters = z.infer<typeof SetBlockStateParameterActionParameters>;
export const SetBlockStateParameterActionParameters = z.object({
    xOffset: n.Integer.default(0),
    yOffset: n.Integer.default(0),
    zOffset: n.Integer.default(0),
    parameters: z.record(z.string(), n.Primitive)
});

export class SetBlockStateParameterAction extends EventAction {
    private readonly xOffset: n.Argument<number>;
    private readonly yOffset: n.Argument<number>;
    private readonly zOffset: n.Argument<number>;
    private readonly blockParameters: Map<string, n.Argument<string | number | boolean>>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = SetBlockStateParameterActionParameters.parse(args);

        this.xOffset = parameter(parsed.xOffset, isInteger);
        this.yOffset = parameter(parsed.yOffset, isInteger);
        this.zOffset = parameter(parsed.zOffset, isInteger);

        this.blockParameters = new Map;
        for(const [ param, value ] of Object.entries(parsed.parameters)) {
            this.blockParameters.set(param, parameter(value, isPrimitive));
        }
    }
    public override run(cursor: EventCursor): void {
        const xOffset = this.xOffset(cursor);
        const yOffset = this.yOffset(cursor);
        const zOffset = this.zOffset(cursor);

        const blockStateId = cursor.world.getBlockState(
            cursor.x + xOffset,
            cursor.y + yOffset,
            cursor.z + zOffset
        );
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
                const overwrittenKey = this.blockParameters.get(blockStateId.slice(keyReadStart, i));
                if(overwrittenKey) {
                    newBlockStateId += blockStateId.slice(lastSlice, i + 1) + overwrittenKey(cursor);
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

        newBlockStateId += blockStateId.slice(lastSlice);
        
        cursor.world.setBlockState(
            cursor.x + xOffset,
            cursor.y + yOffset,
            cursor.z + zOffset,
            newBlockStateId
        );
    }
}