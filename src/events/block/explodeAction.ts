import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";
import { blockStateRegistry } from "../../block/blockRegistry";

export type ExplodeActionParameters = z.infer<typeof ExplodeActionParameters>;
export const ExplodeActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    radius: z.number().default(4)
});

export class ExplodeAction extends EventAction<ExplodeActionParameters> {
    public constructor(eventSheet: EventSheet, args: ExplodeActionParameters) {
        super(eventSheet, ExplodeActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        const { xOffset, yOffset, zOffset, radius } = this.args;

        const originalX = cursor.x;
        const originalY = cursor.y;
        const originalZ = cursor.z;

        const centerX = cursor.x + xOffset;
        const centerY = cursor.y + yOffset;
        const centerZ = cursor.z + zOffset;

        const minX = Math.floor(centerX - radius);
        const maxX = Math.floor(centerX + radius);
        const minY = Math.floor(centerY - radius);
        const maxY = Math.floor(centerY + radius);
        const minZ = Math.floor(centerZ - radius);
        const maxZ = Math.floor(centerZ + radius);

        const radiusSquare = radius * radius;

        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    if(
                        (x - centerX) * (x - centerX) +
                        (y - centerY) * (y - centerY) +
                        (z - centerZ) * (z - centerZ) >
                        radiusSquare
                    ) continue;

                    const previousBlock = cursor.world.getBlockState(x, y, z);
                    const events = blockStateRegistry.get(previousBlock)?.events;

                    let prevented = false;
                    if(events != null && events.triggers.size > 0) {
                        const wasDefaultPrevented = cursor.defaultPrevented;
                        cursor.defaultPrevented = false;

                        cursor.setPosition(x, y, z);
                        events.runTrigger("base:explode", cursor);

                        prevented = cursor.defaultPrevented;
                        cursor.defaultPrevented = wasDefaultPrevented;
                    }

                    if(!prevented) {
                        cursor.world.setBlockState(x, y, z, "base:air[default]");
                        cursor.clientPlatform?.blockBreakParticles?.blockDestructionParticles(x, y, z, previousBlock, 0.1);
                    }
                }
            }
        }

        cursor.setPosition(originalX, originalY, originalZ);
    }
}