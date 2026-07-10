import { Input } from "@pixi/ui";
import { Assets, TextStyle, Texture } from "pixi.js";

export class GuiInput extends Input {
    public constructor(placeholder: string, width: number, height: number) {
        super({
            bg: Assets.get("base:ui/input.png"),
            nineSliceSprite: [3, 3, 3, 3],
            placeholder,
            padding: 3,
            align: "left",
            textStyle: new TextStyle({
                fill: 0xffffff,
                fontSize: 12,
            })
        });

        this.width = width;
        this.height = height;
    }
}