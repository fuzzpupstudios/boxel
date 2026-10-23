import z from "zod";
import { Side } from "../../block/direction";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import n from "../eventVariableTypes";
import { isInteger, isNumber, isString, parameter } from "../eventVariable";

export type ParticleActionParameters = z.infer<typeof ParticleActionParameters>;
export const ParticleActionParameters = z.object({
    at: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 0, 0 ]),
    randomPos: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 0, 0 ]),
    velocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 0, 0 ]),
    randomVelocity: z.tuple([ n.Number, n.Number, n.Number ]).default([ 0, 0, 0 ]),
    useEntityPosition: n.Boolean.default(false),
    addEntityVelocity: n.Boolean.default(false),
    useHitPosition: n.Boolean.default(false),
    block: z.union([
        z.tuple([ n.Integer, n.Integer, n.Integer ]),
        n.String
    ]).default([ 0, 0, 0 ]),
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

export class ParticleAction extends EventAction {
    private readonly x: n.Argument<number>;
    private readonly y: n.Argument<number>;
    private readonly z: n.Argument<number>;
    private readonly randomX: n.Argument<number>;
    private readonly randomY: n.Argument<number>;
    private readonly randomZ: n.Argument<number>;
    private readonly velocityX: n.Argument<number>;
    private readonly velocityY: n.Argument<number>;
    private readonly velocityZ: n.Argument<number>;
    private readonly randomVelocityX: n.Argument<number>;
    private readonly randomVelocityY: n.Argument<number>;
    private readonly randomVelocityZ: n.Argument<number>;
    private readonly useEntityPosition: n.Argument<boolean>;
    private readonly addEntityVelocity: n.Argument<boolean>;
    private readonly useHitPosition: n.Argument<boolean>;
    private readonly blockName?: n.Argument<string>;
    private readonly blockX?: n.Argument<number>;
    private readonly blockY?: n.Argument<number>;
    private readonly blockZ?: n.Argument<number>;
    private readonly side: n.Argument<string>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = ParticleActionParameters.parse(args);

        this.x = parameter(parsed.at[0], isNumber);
        this.y = parameter(parsed.at[1], isNumber);
        this.z = parameter(parsed.at[2], isNumber);
        this.randomX = parameter(parsed.randomPos[0], isNumber);
        this.randomY = parameter(parsed.randomPos[1], isNumber);
        this.randomZ = parameter(parsed.randomPos[2], isNumber);
        this.velocityX = parameter(parsed.velocity[0], isNumber);
        this.velocityY = parameter(parsed.velocity[1], isNumber);
        this.velocityZ = parameter(parsed.velocity[2], isNumber);
        this.randomVelocityX = parameter(parsed.randomVelocity[0], isNumber);
        this.randomVelocityY = parameter(parsed.randomVelocity[1], isNumber);
        this.randomVelocityZ = parameter(parsed.randomVelocity[2], isNumber);
        this.useEntityPosition = parameter(parsed.useEntityPosition);
        this.addEntityVelocity = parameter(parsed.addEntityVelocity);
        this.useHitPosition = parameter(parsed.useHitPosition);
        if(typeof parsed.block == "string") {
            this.blockName = parameter(parsed.block, isString);
        } else if(parsed.block instanceof Array) {
            this.blockX = parameter(parsed.block[0], isInteger);
            this.blockY = parameter(parsed.block[1], isInteger);
            this.blockZ = parameter(parsed.block[2], isInteger);
        }
        this.side = parameter(parsed.side);
    }
    public override run(cursor: EventCursor): void {
        if(cursor.clientPlatform == null) return;

        let x = this.x(cursor);
        let y = this.y(cursor);
        let z = this.z(cursor);

        if(this.useEntityPosition(cursor) && cursor.entity != null) {
            x += cursor.entity?.position.x,
            y += cursor.entity?.position.y,
            z += cursor.entity?.position.z
        } else if(this.useHitPosition(cursor) && cursor.entity != null) {
            x += cursor.voxelHitX,
            y += cursor.voxelHitY,
            z += cursor.voxelHitZ
        } else {
            x += cursor.x + 0.5,
            y += cursor.y + 0.5,
            z += cursor.z + 0.5
        }

        x += (Math.random() - 0.5) * this.randomX(cursor);
        y += (Math.random() - 0.5) * this.randomY(cursor);
        z += (Math.random() - 0.5) * this.randomZ(cursor);

        let vx = this.velocityX(cursor);
        let vy = this.velocityY(cursor);
        let vz = this.velocityZ(cursor);

        if(this.addEntityVelocity(cursor) && cursor.entity != null) {
            vx += cursor.entity.velocity.x;
            vy += cursor.entity.velocity.y;
            vz += cursor.entity.velocity.z;
        }

        vx += (Math.random() - 0.5) * this.randomVelocityX(cursor);
        vy += (Math.random() - 0.5) * this.randomVelocityY(cursor);
        vz += (Math.random() - 0.5) * this.randomVelocityZ(cursor);

        let side: Side;
        switch(this.side(cursor)) {
            case "east":
                side = Side.EAST;
                break;
            case "west":
                side = Side.WEST;
                break;
            case "up":
                side = Side.UP;
                break;
            case "down":
                side = Side.DOWN;
                break;
            case "south":
                side = Side.SOUTH;
                break;
            case "north":
                side = Side.NORTH;
                break;
            default:
                if(cursor.faceNormalX === 1) side = Side.EAST;
                else if(cursor.faceNormalX === -1) side = Side.WEST;
                else if(cursor.faceNormalY === 1) side = Side.UP;
                else if(cursor.faceNormalY === -1) side = Side.DOWN;
                else if(cursor.faceNormalZ === 1) side = Side.SOUTH;
                else if(cursor.faceNormalZ === -1) side = Side.NORTH;
                else side = Side.UP;
                break;
        }

        let blockStateId;
        if(this.blockName) {
            blockStateId = this.blockName(cursor);
        } else {
            blockStateId = cursor.world.getBlockState(
                cursor.x + this.blockX!(cursor),
                cursor.y + this.blockY!(cursor),
                cursor.z + this.blockZ!(cursor)
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