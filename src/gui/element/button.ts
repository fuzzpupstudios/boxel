import { ButtonContainer } from "@pixi/ui";
import { Assets, Container, NineSliceSprite } from "pixi.js";
import { GuiText } from "./text";

export class GuiButton extends ButtonContainer {
    private _text: string;
    private _width: number;
    private _height: number;
    public readonly background: NineSliceSprite;
    public readonly textNode: GuiText;

    public constructor(text: string, width: number, height: number) {
        const background = new NineSliceSprite({
            texture: Assets.get("base:ui/button.png"),
            leftWidth: 3,
            topHeight: 3,
            rightWidth: 3,
            bottomHeight: 3,

            width, height
        });
        background.anchor.set(0.5);

        const textNode = new GuiText({ text, align: "center" });
        textNode.setAnchor(0.5, 0.5);

        const buttonContainer = new Container({ children: [ background, textNode ] });

        super(buttonContainer);

        this._text = text;
        this._width = width;
        this._height = height;
        this.background = background;
        this.textNode = textNode;

        this.updateSize();
    }

    private updateSize() {
        this.background.width = this._width;
        this.background.height = this._height;

        this.background.position.set(0, 0);
        this.textNode.position.set(0, 0);
        this.pivot.set(0, 0);
    }

    public get width() {
        return this._width;
    }
    public set width(width: number) {
        this._width = width;
        this.updateSize();
    }
    public get height() {
        return this._height;
    }
    public set height(height: number) {
        this._height = height;
        this.updateSize();
    }
    public get text() {
        return this._text;
    }
    public set text(text: string) {
        this._text = text;
        this.textNode.text = text;
    }
}