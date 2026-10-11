import z from "zod";
import { GuiProgressBarGraphicContainer } from "../../gui/graphic/progress";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";
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
    n.Parameter
]);

export class SetProgressBarFillAction extends EventAction {
    private readonly getGuiFromCursor: boolean;
    private readonly gui?: n.Argument<string>;
    private readonly graphic?: n.Argument<string>;
    private readonly value: n.Argument<number>;

    public constructor(
        eventSheet: EventSheet,
        args: unknown
    ) {
        super(eventSheet);
        const parsed = SetProgressBarFillActionParameters.parse(args);

        if(typeof parsed == "object" && "gui" in parsed) {
            this.getGuiFromCursor = false;
            this.gui = parameter(parsed.gui);
            this.graphic = parameter(parsed.graphic);
            this.value = parameter(parsed.value);
        } else {
            this.getGuiFromCursor = true;

            if(typeof parsed == "number") {
                this.value = parameter(parsed);
            } else if("value" in parsed) {
                this.value = parameter(parsed.value);
            } else {
                this.value = parameterOuter(parsed, isNumber);
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
        }
        if(graphic == null) return;

        if(graphic instanceof GuiProgressBarGraphicContainer) {
            const value = this.value(cursor);
            graphic.value = value;
        }
    }
}