import { ButtonContainer } from "@pixi/ui";
import { Sprite, Texture } from "pixi.js";

export class IconButton extends ButtonContainer {
    public constructor(texture: Texture) {
        const leftSprite = new Sprite(texture);
        leftSprite.anchor.set(0.5);

        super(leftSprite);
    }
}