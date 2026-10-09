import z from "zod";
import { InventorySlot } from "../../item/inventory";
import { EventParamGetter } from "../eventParamGetter";
import type { EventCursor } from "../eventSheet";
import { isString, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export const BlockEntityDataParamGetterParams = z.union([
    z.string(),
    z.object({
        at: z.tuple([ n.Integer, n.Integer, n.Integer ]).default([ 0, 0, 0 ]),
        prop: n.String
    })
])

export class BlockEntityDataParamGetter extends EventParamGetter<any> {
    private readonly prop: n.Argument<string>;
    private readonly blockX: n.Argument<number>;
    private readonly blockY: n.Argument<number>;
    private readonly blockZ: n.Argument<number>;

    public constructor(params: unknown) {
        super();
        
        const parsed = BlockEntityDataParamGetterParams.parse(params);

        if(typeof parsed == "string") {
            this.prop = parameter(parsed);
            this.blockX = parameter(0);
            this.blockY = parameter(0);
            this.blockZ = parameter(0);
        } else {
            this.prop = parameter(parsed.prop, isString);
            this.blockX = parameter(parsed.at[0]);
            this.blockY = parameter(parsed.at[1]);
            this.blockZ = parameter(parsed.at[2]);
        }
    }
    public get(cursor: EventCursor): any {
        const blockEntity = cursor.world.getBlockEntity(
            cursor.x + this.blockX(cursor),
            cursor.y + this.blockY(cursor),
            cursor.z + this.blockZ(cursor)
        );
        if(blockEntity == null) return null;

        return blockEntity.customData[this.prop(cursor)];
    }
}