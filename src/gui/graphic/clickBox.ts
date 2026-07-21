import { Container, Rectangle } from "pixi.js";
import z from "zod";
import { type GuiGraphicContainer } from "./graphic";

export type GuiClickBoxGraphicArgs = z.infer<typeof GuiClickBoxGraphicArgs>;
export const GuiClickBoxGraphicArgs = z.object({
    size: z.tuple([
        z.number(),
        z.number()
    ])
});

export class GuiClickBoxGraphicContainer extends Container implements GuiGraphicContainer {
    public readonly isGuiGraphicContainer = true;

    public constructor(
        public readonly graphicId: string,
        args: any
    ) {
        const parsedArgs = GuiClickBoxGraphicArgs.parse(args);

        super();

        this.eventMode = "static";
        this.hitArea = new Rectangle(0, 0, ...parsedArgs.size);
    }
}