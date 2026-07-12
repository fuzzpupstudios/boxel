import z from "zod";
import { EventAction } from "../eventAction";
import type { EventSheet, EventCursor } from "../eventSheet";

export type PlaySound2dActionParameters = z.infer<typeof PlaySound2dActionParameters>;
export const PlaySound2dActionParameters = z.object({
    xOffset: z.number().default(0),
    yOffset: z.number().default(0),
    zOffset: z.number().default(0),
    sound: z.string()
});

export class PlaySound2dAction extends EventAction<PlaySound2dActionParameters> {
    public constructor(eventSheet: EventSheet, args: PlaySound2dActionParameters) {
        super(eventSheet, PlaySound2dActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        cursor.clientPlatform?.audioManager.playSound2d(this.args.sound);
    }
}