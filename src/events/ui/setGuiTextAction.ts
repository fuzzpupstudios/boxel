import z from "zod";
import { GuiTextGraphicContainer } from "../../gui/graphic/text";
import type { EventAction } from "../eventAction";
import type { EventSheet } from "../eventSheet";
import { isString, parameter, parameterOuter } from "../eventVariable";
import n from "../eventVariableTypes";

export type SetGuiTextActionParameters = z.infer<typeof SetGuiTextActionParameters>;
export const SetGuiTextActionParameters = z.union([
    z.object({
        gui: n.String,
        graphic: n.String,
        text: n.String
    }),
    z.object({
        text: n.String
    }),
    z.string(),
    n.OuterParameter
]);

export function setGuiTextAction(args: unknown, eventSheet: EventSheet): EventAction {
    const parsed = SetGuiTextActionParameters.parse(args);

    let getGuiFromCursor: boolean;
    let guiParam: n.Parameter<string> | undefined;
    let graphicParam: n.Parameter<string> | undefined;
    let text: n.Parameter<string>;

    if(typeof parsed == "object" && "gui" in parsed) {
        getGuiFromCursor = false;
        guiParam = parameter(parsed.gui);
        graphicParam = parameter(parsed.graphic);
        text = parameter(parsed.text);
    } else {
        getGuiFromCursor = true;

        if(typeof parsed == "string") {
            text = parameter(parsed);
        } else if("text" in parsed) {
            text = parameter(parsed.text);
        } else {
            text = parameterOuter(parsed, isString);
        }
    }

    return (cursor) => {
        if(cursor.clientPlatform == null) return;

        let graphic;

        if(getGuiFromCursor) {
            graphic = cursor.graphic;
        } else {
            const guiName = guiParam!(cursor);
            const gui = cursor.clientPlatform.guiManager.getOpenGui(guiName);
            if(gui == null) return;

            const graphicName = graphicParam!(cursor);
            graphic = gui.getGraphicContainer(graphicName);
            if(graphic == null) return;
        }

        if(graphic instanceof GuiTextGraphicContainer) {
            const value = text(cursor);
            graphic.text = value;
        }
    }
}