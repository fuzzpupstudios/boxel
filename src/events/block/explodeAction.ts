import z from "zod";
import { blockStateRegistry } from "../../block/blockRegistry";
import { ItemEntity } from "../../entity/item";
import type { EventAction } from "../eventAction";
import { isNumber, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type ExplodeActionParameters = z.infer<typeof ExplodeActionParameters>;
export const ExplodeActionParameters = z.object({
    xOffset: n.Number.default(0),
    yOffset: n.Number.default(0),
    zOffset: n.Number.default(0),
    radius: n.Number.default(4)
});

export function explodeAction(args: unknown): EventAction {
    const parsed = ExplodeActionParameters.parse(args);

    const xOffsetParam = parameter(parsed.xOffset, isNumber);
    const yOffsetParam = parameter(parsed.yOffset, isNumber);
    const zOffsetParam = parameter(parsed.zOffset, isNumber);
    const radiusParam = parameter(parsed.radius, isNumber);

    return (cursor) => {
        const xOffset = xOffsetParam(cursor);
        const yOffset = yOffsetParam(cursor);
        const zOffset = zOffsetParam(cursor);
        const radius = radiusParam(cursor);

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

                    const previousBlockStateId = cursor.world.getBlockState(x, y, z);
                    const previousBlockState = blockStateRegistry.get(previousBlockStateId);
                    const events = previousBlockState?.events;

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
                        const blockEntity = cursor.world.getBlockEntity(x, y, z);
                        if(blockEntity != null && blockEntity.hasInventory()) {
                            ItemEntity.spewInventory(
                                blockEntity.inventory,
                                cursor.world,
                                x + 0.5, y + 0.5, z + 0.5
                            );
                        }

                        cursor.world.setBlockState(x, y, z, "base:air[default]");
                        cursor.clientPlatform?.blockBreakParticles.blockDestructionParticles(x, y, z, previousBlockStateId, 0.1);
                    }
                }
            }
        }

        cursor.setPosition(originalX, originalY, originalZ);
    }
}