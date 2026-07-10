import z from "zod";
import { EventPredicate } from "../eventPredicate";
import type { EventCursor } from "../eventSheet";
import { blockStateRegistry } from "../../block/blockRegistry";

export type BlockEventPredicateParameters = z.infer<typeof BlockEventPredicateParameters>;
export const BlockEventPredicateParameters = z.object({
    at: z.tuple([
        z.number(),
        z.number(),
        z.number(),
    ]),
    has_tag: z.string().optional()
})

export class BlockEventPredicate extends EventPredicate<BlockEventPredicateParameters> {
    public override test(cursor: EventCursor): boolean {
        const blockStateId = cursor.world.getBlockState(
            cursor.x + this.args.at[0],
            cursor.y + this.args.at[1],
            cursor.z + this.args.at[2]
        );
        const blockState = blockStateRegistry.get(blockStateId);

        if(blockState == null) return false;

        if(this.args.has_tag) {
            if(!blockState.tags.has(this.args.has_tag)) return false;
        }

        return true;
    }
}