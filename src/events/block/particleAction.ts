import z from "zod";
import { Side } from "../../block/direction";
import type { EventAction } from "../eventAction";
import type { EventSheet } from "../eventSheet";
import { isInteger, isNumber, isString, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type ParticleActionParameters = z.infer<typeof ParticleActionParameters>;
export const ParticleActionParameters = z.object({
    at: z.tuple([n.Number, n.Number, n.Number]).default([0, 0, 0]),
    randomPos: z.tuple([n.Number, n.Number, n.Number]).default([0, 0, 0]),
    velocity: z.tuple([n.Number, n.Number, n.Number]).default([0, 0, 0]),
    randomVelocity: z.tuple([n.Number, n.Number, n.Number]).default([0, 0, 0]),
    useEntityPosition: n.Boolean.default(false),
    addEntityVelocity: n.Boolean.default(false),
    useHitPosition: n.Boolean.default(false),
    block: z.union([
        z.tuple([n.Integer, n.Integer, n.Integer]),
        n.String
    ]).default([0, 0, 0]),
    side: z.enum([
        "north" as const,
        "east" as const,
        "south" as const,
        "west" as const,
        "up" as const,
        "down" as const,
        "inherit" as const
    ]).or(n.InnerParameter).default("inherit")
});

export function particleAction(args: unknown): EventAction {
    const parsed = ParticleActionParameters.parse(args);

    const xParam = parameter(parsed.at[0], isNumber);
    const yParam = parameter(parsed.at[1], isNumber);
    const zParam = parameter(parsed.at[2], isNumber);
    const randomX = parameter(parsed.randomPos[0], isNumber);
    const randomY = parameter(parsed.randomPos[1], isNumber);
    const randomZ = parameter(parsed.randomPos[2], isNumber);
    const velocityX = parameter(parsed.velocity[0], isNumber);
    const velocityY = parameter(parsed.velocity[1], isNumber);
    const velocityZ = parameter(parsed.velocity[2], isNumber);
    const randomVelocityX = parameter(parsed.randomVelocity[0], isNumber);
    const randomVelocityY = parameter(parsed.randomVelocity[1], isNumber);
    const randomVelocityZ = parameter(parsed.randomVelocity[2], isNumber);
    const useEntityPosition = parameter(parsed.useEntityPosition);
    const addEntityVelocity = parameter(parsed.addEntityVelocity);
    const useHitPosition = parameter(parsed.useHitPosition);
    let blockName: n.Parameter<string> | undefined;
    let blockX: n.Parameter<number> | undefined;
    let blockY: n.Parameter<number> | undefined;
    let blockZ: n.Parameter<number> | undefined;
    if (typeof parsed.block == "string") {
        blockName = parameter(parsed.block, isString);
    } else if (parsed.block instanceof Array) {
        blockX = parameter(parsed.block[0], isInteger);
        blockY = parameter(parsed.block[1], isInteger);
        blockZ = parameter(parsed.block[2], isInteger);
    }
    const sideParam = parameter(parsed.side);

    return (cursor) => {
        if (cursor.clientPlatform == null) return;

        let x = xParam(cursor);
        let y = yParam(cursor);
        let z = zParam(cursor);

        if(useEntityPosition(cursor) && cursor.entity != null) {
            x += cursor.entity.position.x;
            y += cursor.entity.position.y;
            z += cursor.entity.position.z;
        } else if(useHitPosition(cursor) && cursor.entity != null) {
            x += cursor.voxelHitX;
            y += cursor.voxelHitY;
            z += cursor.voxelHitZ;
        } else {
            x += cursor.x + 0.5;
            y += cursor.y + 0.5;
            z += cursor.z + 0.5;
        }

        x += (Math.random() - 0.5) * randomX(cursor);
        y += (Math.random() - 0.5) * randomY(cursor);
        z += (Math.random() - 0.5) * randomZ(cursor);

        let vx = velocityX(cursor);
        let vy = velocityY(cursor);
        let vz = velocityZ(cursor);

        if(addEntityVelocity(cursor) && cursor.entity != null) {
            vx += cursor.entity.velocity.x;
            vy += cursor.entity.velocity.y;
            vz += cursor.entity.velocity.z;
        }

        vx += (Math.random() - 0.5) * randomVelocityX(cursor);
        vy += (Math.random() - 0.5) * randomVelocityY(cursor);
        vz += (Math.random() - 0.5) * randomVelocityZ(cursor);

        let side: Side;
        switch(sideParam(cursor)) {
            case "east": side = Side.EAST; break;
            case "west": side = Side.WEST; break;
            case "up": side = Side.UP; break;
            case "down": side = Side.DOWN; break;
            case "south": side = Side.SOUTH; break;
            case "north": side = Side.NORTH; break;

            default:
                if (cursor.faceNormalX === 1) side = Side.EAST;
                else if (cursor.faceNormalX === -1) side = Side.WEST;
                else if (cursor.faceNormalY === 1) side = Side.UP;
                else if (cursor.faceNormalY === -1) side = Side.DOWN;
                else if (cursor.faceNormalZ === 1) side = Side.SOUTH;
                else if (cursor.faceNormalZ === -1) side = Side.NORTH;
                else side = Side.UP;
                break;
        }

        let blockStateId;
        if(blockName) {
            blockStateId = blockName(cursor);
        } else {
            blockStateId = cursor.world.getBlockState(
                cursor.x + blockX!(cursor),
                cursor.y + blockY!(cursor),
                cursor.z + blockZ!(cursor)
            );
        }

        const tileMesh = cursor.world.renderer?.meshCache.getMeshFromBlockStateId(blockStateId);
        if(tileMesh == null) return;

        cursor.clientPlatform.blockBreakParticles.blockParticle(
            x, y, z,
            vx, vy, vz,
            side, tileMesh
        );
    }
}