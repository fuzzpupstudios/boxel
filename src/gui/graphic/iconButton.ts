import { Assets } from "pixi.js";
import z from "zod";
import { IconButton } from "../element/iconButton";
import { type GuiGraphicContainer } from "./graphic";

export type GuiIconButtonGraphicArgs = z.infer<typeof GuiIconButtonGraphicArgs>;
export const GuiIconButtonGraphicArgs = z.object({
    texture: z.string()
});

export class GuiIconButtonGraphicContainer extends IconButton implements GuiGraphicContainer {
    public readonly isGuiGraphicContainer = true;

    public constructor(
        public readonly graphicId: string,
        args: any
    ) {
        const parsedArgs = GuiIconButtonGraphicArgs.parse(args);

        super(Assets.get(parsedArgs.texture));
    }
}