import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";

export type PlaySound3dActionParameters = z.infer<typeof PlaySound3dActionParameters>;
export const PlaySound3dActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    sound: z.string()
});

export class PlaySound3dAction extends EventAction<PlaySound3dActionParameters> {
    public constructor(eventSheet: EventSheet, args: PlaySound3dActionParameters) {
        super(eventSheet, PlaySound3dActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        cursor.clientPlatform?.audioManager.playSound3d(
            this.args.sound,
            cursor.x + this.args.xOffset,
            cursor.y + this.args.yOffset,
            cursor.z + this.args.zOffset,
        );
    }
}