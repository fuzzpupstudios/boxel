import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";

export type SetBlockStateParameterActionParameters = z.infer<typeof SetBlockStateParameterActionParameters>;
export const SetBlockStateParameterActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    parameters: z.record(z.string(), z.string())
});

export class SetBlockStateParameterAction extends EventAction<SetBlockStateParameterActionParameters> {
    public constructor(eventSheet: EventSheet, args: SetBlockStateParameterActionParameters) {
        super(eventSheet, SetBlockStateParameterActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        const blockStateId = cursor.world.getBlockState(
            cursor.x + this.args.xOffset,
            cursor.y + this.args.yOffset,
            cursor.z + this.args.zOffset
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

        for(const [ key, value ] of Object.entries(this.args.parameters)) {
            params.set(key, value);
        }
        
        const newParameterString = params
            .entries()
            .map(entry => entry[0] + "=" + entry[1])
            .toArray()
            .join(",");
        
        cursor.world.setBlockState(
            cursor.x + this.args.xOffset,
            cursor.y + this.args.yOffset,
            cursor.z + this.args.zOffset,
            baseBlock + "[" + newParameterString + "]"
        );
    }
}