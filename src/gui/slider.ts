import { Slider } from "@pixi/ui";
import { Assets, BitmapText, Color, Container, FederatedPointerEvent, getGlobalBounds, NineSliceSprite, Sprite, TextStyle } from "pixi.js";
import { MathUtils } from "three";

export class GuiSlider extends Container {
    private readonly background: NineSliceSprite;
    private readonly fill: NineSliceSprite;
    private readonly handle: NineSliceSprite;
    private readonly textNode: BitmapText;
    private _text: string;
    private _width: number;
    private _height: number;
    
    public step: number;
    private _min: number;
    private _max: number;
    private _value: number;
    private dragging: boolean = false;

    public constructor(min: number, max: number, value: number, step: number, width: number, height: number, text: string) {
        const background = new NineSliceSprite({
            texture: Assets.get("base:ui/slider_background.png"),
            leftWidth: 3,
            topHeight: 3,
            rightWidth: 3,
            bottomHeight: 3,

            width, height
        });
        background.anchor.set(0.5);

        const fill = new NineSliceSprite({
            texture: Assets.get("base:ui/slider_fill.png"),
            leftWidth: 3,
            topHeight: 3,
            rightWidth: 3,
            bottomHeight: 3,

            width, height
        });
        fill.anchor.set(0, 0.5);

        const handle = new NineSliceSprite({
            texture: Assets.get("base:ui/slider_handle.png"),
            leftWidth: 1,
            topHeight: 1,
            rightWidth: 1,
            bottomHeight: 1,

            width, height
        });
        handle.anchor.set(0.5, 0.5);
        handle.width = 3;
        
        const textStyle = new TextStyle({
            fill: new Color(0xffffff),
            fontFamily: "BoxelFont",
            fontSize: 12
        });
        const textNode = new BitmapText({ text, style: textStyle });
        textNode.anchor.set(0.5);

        super({
            children: [ background, fill, handle, textNode ],
            interactive: true
        });

        this.background = background;
        this.fill = fill;
        this.handle = handle;
        this.textNode = textNode;

        this.pivot.set(width / 2, this.height / 2);
        this._text = text;
        this._width = width;
        this._height = height;
        this._min = min;
        this._max = max;
        this.step = step;
        this._value = value;

        this.updateSize();

        this.addListener("pointerdown", (event) => {
            this.dragging = true;
            this.updateValueFromPointer(event);

            this.emit("input");
        });
        this.addListener("pointerupoutside", () => {
            this.dragging = false;
        });
        this.addListener("pointerup", () => {
            this.dragging = false;

            this.emit("change");
        });
        this.addListener("globalpointermove", (event) => {
            if(!this.dragging) return;
            this.updateValueFromPointer(event);

            this.emit("input");
        });
    }

    private updateValueFromPointer(event: FederatedPointerEvent) {
        const local = event.getLocalPosition(this);
        const mapped = MathUtils.mapLinear(local.x,
            -this._width / 2 + 1.5, this._width / 2 - 1.5, this._min, this._max);
        const rounded = this.step == 0 ? mapped : Math.round(mapped / this.step) * this.step;

        this.value = MathUtils.clamp(rounded, this._min, this._max);
    }

    private updateSize() {
        this.background.width = this._width;
        this.background.height = this._height;

        this.handle.position.set(Math.round(MathUtils.mapLinear(
            this._value, this._min, this._max,
            -this._width / 2 + 1.5, this._width / 2 - 1.5
        ) + 0.5) - 0.5, 0);
        this.handle.height = this._height + 2;

        this.fill.width = this.handle.position.x + this._width / 2;
        this.fill.height = this._height;
        this.fill.pivot.set(this._width * 0.5, 0);

        if(this.fill.width < 3) {
            this.fill.rightWidth = 0;
            this.fill.width = 3;
        } else {
            this.fill.rightWidth = 3;
        }

        this.background.position.set(0, 0);
        this.fill.position.set(0, 0);
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
    public get min() {
        return this._min;
    }
    public set min(min: number) {
        this._min = min;
        this.updateSize();
    }
    public get max() {
        return this._max;
    }
    public set max(max: number) {
        this._max = max;
        this.updateSize();
    }
    public get value() {
        return this._value;
    }
    public set value(value: number) {
        this._value = value;
        this.updateSize();
    }
}