import { Assets, Color } from "pixi.js";
import z from "zod";
import { IconButton } from "../iconButton";
import { type GuiGraphicContainer } from "./guiGraphic";
import { GuiText, type GuiTextOptions } from "../guiText";

export type GuiTextGraphicArgs = z.infer<typeof GuiTextGraphicArgs>;
export const GuiTextGraphicArgs = z.object({
    text: z.string().default(""),
    fontScale: z.number().default(1),
    align: z.enum([ "left", "center", "right", "justify" ]).default("left"),
    fill: z.tuple([
        z.number(),
        z.number(),
        z.number()
    ]).default([ 1, 1, 1 ]),
    anchor: z.tuple([ z.number(), z.number() ]).default([ 0, 0 ])
});

export class GuiTextGraphicContainer extends GuiText implements GuiGraphicContainer {
    public readonly isGuiGraphicContainer = true;

    public constructor(
        public readonly graphicId: string,
        args: GuiTextOptions
    ) {
        const parsedArgs = GuiTextGraphicArgs.parse(args);

        super({
            text: parsedArgs.text,
            fontScale: parsedArgs.fontScale,
            align: parsedArgs.align,
            fill: new Color(parsedArgs.fill),
        });
        this.setAnchor(...parsedArgs.anchor);
    }
}