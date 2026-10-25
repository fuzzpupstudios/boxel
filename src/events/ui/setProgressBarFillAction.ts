import z from "zod";
import { GuiProgressBarGraphicContainer } from "../../gui/graphic/progress";
import type { EventAction } from "../eventAction";
import type { EventSheet } from "../eventSheet";
import { isNumber, parameter, parameterOuter } from "../eventVariable";
import n from "../eventVariableTypes";

export type SetProgressBarFillActionParameters = z.infer<typeof SetProgressBarFillActionParameters>;
export const SetProgressBarFillActionParameters = z.union([
    z.object({
        gui: n.String,
        graphic: n.String,
        value: n.Number
    }),
    z.object({
        value: n.Number
    }),
    z.number(),
    n.OuterParameter
]);

export function setProgressBarFillAction(args: unknown, eventSheet: EventSheet): EventAction {
    const parsed = SetProgressBarFillActionParameters.parse(args);

    let getGuiFromCursor: boolean;
    let guiParam: n.Parameter<string> | undefined;
    let graphicParam: n.Parameter<string> | undefined;
    let valueParam: n.Parameter<number>;

    if(typeof parsed == "object" && "gui" in parsed) {
        getGuiFromCursor = false;
        guiParam = parameter(parsed.gui);
        graphicParam = parameter(parsed.graphic);
        valueParam = parameter(parsed.value);
    } else {
        getGuiFromCursor = true;

        if(typeof parsed == "number") {
            valueParam = parameter(parsed);
        } else if("value" in parsed) {
            valueParam = parameter(parsed.value);
        } else {
            valueParam = parameterOuter(parsed, isNumber);
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
        }
        if(graphic == null) return;

        if(graphic instanceof GuiProgressBarGraphicContainer) {
            const value = valueParam(cursor);
            graphic.value = value;
        }
    }
}