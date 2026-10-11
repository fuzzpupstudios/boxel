import z from "zod";
import { GuiProgressBarGraphicContainer } from "../../gui/graphic/progress";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
import { isNumber, isString, parameter, parameterOuter } from "../eventVariable";
import n from "../eventVariableTypes";
import { GuiTextGraphicContainer } from "../../gui/graphic/text";

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
    n.Parameter
]);

export class SetGuiTextAction extends EventAction {
    private readonly getGuiFromCursor: boolean;
    private readonly gui?: n.Argument<string>;
    private readonly graphic?: n.Argument<string>;
    private readonly text: n.Argument<string>;

    public constructor(
        eventSheet: EventSheet,
        args: unknown
    ) {
        super(eventSheet);
        const parsed = SetGuiTextActionParameters.parse(args);

        if(typeof parsed == "object" && "gui" in parsed) {
            this.getGuiFromCursor = false;
            this.gui = parameter(parsed.gui);
            this.graphic = parameter(parsed.graphic);
            this.text = parameter(parsed.text);
        } else {
            this.getGuiFromCursor = true;

            if(typeof parsed == "string") {
                this.text = parameter(parsed);
            } else if("text" in parsed) {
                this.text = parameter(parsed.text);
            } else {
                this.text = parameterOuter(parsed, isString);
            }
        }
    }
    public override run(cursor: EventCursor): void {
        if(cursor.clientPlatform == null) return;

        let graphic;

        if(this.getGuiFromCursor) {
            graphic = cursor.graphic;
        } else {
            const guiName = this.gui!(cursor);
            const gui = cursor.clientPlatform.guiManager.getOpenGui(guiName);
            if(gui == null) return;

            const graphicName = this.graphic!(cursor);
            graphic = gui.getGraphicContainer(graphicName);
            if(graphic == null) return;
        }

        if(graphic instanceof GuiTextGraphicContainer) {
            const value = this.text(cursor);
            graphic.text = value;
        }
    }
}