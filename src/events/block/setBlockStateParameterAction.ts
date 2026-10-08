import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import n from "../eventVariableTypes";
import { isInteger, isPrimitive, parameter } from "../eventVariable";

export type SetBlockStateParameterActionParameters = z.infer<typeof SetBlockStateParameterActionParameters>;
export const SetBlockStateParameterActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    parameters: z.record(z.string(), z.string())
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

        const bracketPos = blockStateId.indexOf("[");
        const baseBlock = blockStateId.slice(0, bracketPos);
        const parameterString = blockStateId.slice(bracketPos + 1, -1);
        const params = new Map<string, string>;

        for(const pair of parameterString.split(",")) {
            const [ key, value ] = pair.split("=");

            if(key == null || value == null) continue;
            params.set(key, value);
        }

        for(const [ key, value ] of this.blockParameters) {
            params.set(key, value(cursor).toString());
        }
        
        const newParameterString = params
            .entries()
            .map(entry => entry[0] + "=" + entry[1])
            .toArray()
            .join(",");
        
        cursor.world.setBlockState(
            cursor.x + xOffset,
            cursor.y + yOffset,
            cursor.z + zOffset,
            baseBlock + "[" + newParameterString + "]"
        );
    }
}