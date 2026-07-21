import { BitmapText, Color, Container, TextStyle, type ContainerOptions, type TextStyleAlign } from "pixi.js";

export interface GuiTextOptions {
    text?: string;
    fontScale?: number;
    align?: TextStyleAlign;
    fill?: Color
}

export class GuiText extends Container {
    private _fontScale: number = 1;
    private _align: TextStyleAlign = "left";
    private _fill: Color = new Color(0xffffff);
    private _text: string = "";
    public readonly shadow: BitmapText;
    public readonly mainText: BitmapText;

    public constructor(options?: GuiTextOptions & ContainerOptions) {
        const shadow = new BitmapText({
            text: "",
            style: new TextStyle({
                fill: new Color(0x444444),
                fontFamily: "BoxelFont"
            })
        });
        const mainText = new BitmapText({
            text: "",
            style: new TextStyle({
                fontFamily: "BoxelFont"
            }),
            children: [ shadow ]
        });
        shadow.anchor = mainText.anchor;

        const optionsClone = Object.assign({
            children: [ shadow, mainText ]
        }, options);
        delete optionsClone.text;
        delete optionsClone.fontScale;
        delete optionsClone.align;
        delete optionsClone.fill;
        super(optionsClone);

        this.shadow = shadow;
        this.mainText = mainText;

        options ??= {};
        this.text = options.text ?? this._text;
        this.fontScale = options.fontScale ?? this._fontScale;
        this.align = options.align ?? this._align;
        this.fill = options.fill ?? this._fill;
    }

    public setAnchor(x: number, y: number = x) {
        this.mainText.anchor.set(x, y);
        this.shadow.anchor.set(x, y);
    }

    public set text(text: string) {
        this.mainText.text = text;
        this.shadow.text = text;

        this._text = text;
    }
    public get text() {
        return this._text;
    }

    public set fontScale(fontScale: number) {
        this._fontScale = fontScale;

        this.mainText.style.fontSize = 12 * fontScale;
        this.shadow.style.fontSize = 12 * fontScale;

        this.shadow.pivot.set(-fontScale * (12.5/16));
    }
    public get fontScale() {
        return this._fontScale;
    }

    public set align(alignment: TextStyleAlign) {
        this._align = alignment;

        this.mainText.style.align = alignment;
        this.shadow.style.align = alignment;
    }
    public get align() {
        return this._align;
    }

    public set fill(color: Color) {
        this.mainText.style.fill = color;
        
        this._fill = color;
    }

    public get fill() {
        return this._fill;
    }
}