import z from "zod";
import { Side } from "../../block/direction";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

export type ParticleActionParameters = z.infer<typeof ParticleActionParameters>;
export const ParticleActionParameters = z.object({
    at: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0, 0, 0 ]),
    randomPos: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0, 0, 0 ]),
    velocity: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0, 0, 0 ]),
    randomVelocity: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0, 0, 0 ]),
    useEntityPosition: z.boolean().default(false),
    addEntityVelocity: z.boolean().default(false),
    useHitPosition: z.boolean().default(false),
    block: z.union([
        z.tuple([ z.number(), z.number(), z.number() ]),
        z.string()
    ]).default([ 0, 0, 0 ]),
    side: z.enum([
        "north" as const,
        "east" as const,
        "south" as const,
        "west" as const,
        "up" as const,
        "down" as const,
        "inherit" as const
    ]).default("inherit")
});

export class ParticleAction extends EventAction<ParticleActionParameters> {
    public constructor(eventSheet: EventSheet, args: ParticleActionParameters) {
        super(eventSheet, ParticleActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        if(cursor.clientPlatform == null) return;

        let x = this.args.at[0];
        let y = this.args.at[1];
        let z = this.args.at[2];

        if(this.args.useEntityPosition && cursor.entity != null) {
            x += cursor.entity?.position.x,
            y += cursor.entity?.position.y,
            z += cursor.entity?.position.z
        } else if(this.args.useHitPosition && cursor.entity != null) {
            x += cursor.voxelHitX,
            y += cursor.voxelHitY,
            z += cursor.voxelHitZ
        } else {
            x += cursor.x + 0.5,
            y += cursor.y + 0.5,
            z += cursor.z + 0.5
        }

        x += (Math.random() - 0.5) * this.args.randomPos[0];
        y += (Math.random() - 0.5) * this.args.randomPos[1];
        z += (Math.random() - 0.5) * this.args.randomPos[2];

        let vx = this.args.velocity[0];
        let vy = this.args.velocity[1];
        let vz = this.args.velocity[2];

        if(this.args.addEntityVelocity && cursor.entity != null) {
            vx += cursor.entity.velocity.x;
            vy += cursor.entity.velocity.y;
            vz += cursor.entity.velocity.z;
        }

        vx += (Math.random() - 0.5) * this.args.randomVelocity[0];
        vy += (Math.random() - 0.5) * this.args.randomVelocity[1];
        vz += (Math.random() - 0.5) * this.args.randomVelocity[2];

        let side = Side.UP;
        if((this.args.side == "inherit" && cursor.faceNormalX === 1) || this.args.side == "east") {
            side = Side.EAST;
        } else if((this.args.side == "inherit" && cursor.faceNormalX === -1) || this.args.side == "west") {
            side = Side.WEST;
        } else if((this.args.side == "inherit" && cursor.faceNormalY === 1) || this.args.side == "up") {
            side = Side.UP;
        } else if((this.args.side == "inherit" && cursor.faceNormalY === -1) || this.args.side == "down") {
            side = Side.DOWN;
        } else if((this.args.side == "inherit" && cursor.faceNormalZ === 1) || this.args.side == "south") {
            side = Side.SOUTH;
        } else if((this.args.side == "inherit" && cursor.faceNormalZ === -1) || this.args.side == "north") {
            side = Side.NORTH;
        }

        let blockStateId;
        if(typeof this.args.block === "string") {
            blockStateId = this.args.block;
        } else {
            blockStateId = cursor.world.getBlockState(
                cursor.x + this.args.block[0],
                cursor.y + this.args.block[1],
                cursor.z + this.args.block[2]
            );
        }

        const tileMesh = cursor.world.renderer?.chunkMesher.tileMeshes.get(blockStateId);
        if(tileMesh == null) return;

        cursor.clientPlatform.blockBreakParticles.blockParticle(
            x, y, z,
            vx, vy, vz,
            side, tileMesh
        );
    }
}