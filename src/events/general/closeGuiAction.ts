import z from "zod";
import type { EventAction } from "../eventAction";
import { isString, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export type CloseGuiActionParameters = z.infer<typeof CloseGuiActionParameters>;
export const CloseGuiActionParameters = z.object({
    gui: n.String
});

export function closeGuiAction(args: unknown): EventAction {
    const parsed = CloseGuiActionParameters.parse(args);

    const gui = parameter(parsed.gui, isString);

    return (cursor) => {
        cursor.clientPlatform?.guiManager.closeGui(gui(cursor));
    }
}