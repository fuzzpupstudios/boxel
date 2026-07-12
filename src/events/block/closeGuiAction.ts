import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

export type CloseGuiActionParameters = z.infer<typeof CloseGuiActionParameters>;
export const CloseGuiActionParameters = z.object({
    gui: z.string()
});

export class CloseGuiAction extends EventAction<CloseGuiActionParameters> {
    public constructor(eventSheet: EventSheet, args: CloseGuiActionParameters) {
        super(eventSheet, CloseGuiActionParameters.parse(args));
    }
    public override run(cursor: EventCursor): void {
        cursor.guiManager?.closeGui(this.args.gui);
    }
}