import z from "zod";
import { ProgressBarContainer } from "../element/progressBar";
import { type GuiGraphicContainer } from "./graphic";
import { Assets } from "pixi.js";

export type GuiProgressBarGraphicArgs = z.infer<typeof GuiProgressBarGraphicArgs>;
export const GuiProgressBarGraphicArgs = z.object({
    emptyTexture: z.string().optional(),
    texture: z.string(),
    direction: z.enum([ "left", "right", "down", "up" ]).default("right"),
    snap: z.number().default(1)
});

export class GuiProgressBarGraphicContainer extends ProgressBarContainer implements GuiGraphicContainer {
    public readonly isGuiGraphicContainer = true;

    public constructor(
        public readonly graphicId: string,
        args: any
    ) {
        const parsedArgs = GuiProgressBarGraphicArgs.parse(args);

        const fillTexture = Assets.get(parsedArgs.texture);
        if(fillTexture == null) throw new ReferenceError("Cannot find texture " + parsedArgs.texture);

        let emptyTexture;
        if(parsedArgs.emptyTexture != null) emptyTexture = Assets.get(parsedArgs.emptyTexture);

        super({
            fillTexture, emptyTexture,
            direction: parsedArgs.direction,
            snap: parsedArgs.snap
        });
    }
}