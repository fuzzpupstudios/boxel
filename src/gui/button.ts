import { ButtonContainer } from "@pixi/ui";
import { Assets, Color, Container, NineSliceSprite, Text, TextStyle, Texture } from "pixi.js";

export class GuiButton extends ButtonContainer {
    private _text: string;
    private _width: number;
    private _height: number;
    public readonly background: NineSliceSprite;
    public readonly textNode: Text;

    public constructor(text: string, width: number, height: number) {
        const background = new NineSliceSprite({
            texture: Assets.get("ui/button"),
            leftWidth: 3,
            topHeight: 3,
            rightWidth: 3,
            bottomHeight: 3,

            width, height
        });
        background.anchor.set(0.5);

        const textStyle = new TextStyle({
            fill: new Color(0xffffff),
            fontSize: 12
        })
        const textNode = new Text({ text, style: textStyle });
        textNode.anchor.set(0.5);

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