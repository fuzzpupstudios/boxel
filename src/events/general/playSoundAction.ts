import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

export type PlaySoundActionParameters = z.infer<typeof PlaySoundActionParameters>;
export const PlaySoundActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    spatial: z.boolean().default(false),
    sound: z.string()
});

export class PlaySoundAction extends EventAction<PlaySoundActionParameters> {
    public constructor(eventSheet: EventSheet, args: PlaySoundActionParameters) {
        super(eventSheet, PlaySoundActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        if(this.args.spatial) {
            cursor.clientPlatform?.audioManager.playSound3d(
                this.args.sound,
                cursor.x + this.args.xOffset + 0.5,
                cursor.y + this.args.yOffset + 0.5,
                cursor.z + this.args.zOffset + 0.5,
            );
        } else {
            cursor.clientPlatform?.audioManager.playSound2d(this.args.sound);
        }
    }
}