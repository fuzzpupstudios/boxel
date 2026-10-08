import z from "zod";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { isString, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type CloseGuiActionParameters = z.infer<typeof CloseGuiActionParameters>;
export const CloseGuiActionParameters = z.object({
    gui: n.String
});

export class CloseGuiAction extends EventAction {
    private readonly gui: n.Argument<string>;

    public constructor(eventSheet: EventSheet, args: unknown) {
        super(eventSheet);

        const parsed = CloseGuiActionParameters.parse(args);
        this.gui = parameter(parsed.gui, isString);
    }
    public override run(cursor: EventCursor): void {
        cursor.clientPlatform?.guiManager.closeGui(this.gui(cursor));
    }
}