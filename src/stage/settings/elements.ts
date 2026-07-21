import type { Container } from "pixi.js";
import { GuiButton } from "../../gui/element/button";
import { GuiSlider } from "../../gui/element/slider";

export abstract class Setting<T> {
    public abstract element: Container;
    protected abstract getValue(): T;
    protected abstract setValue(value: T): void;
}

export abstract class ToggleButtonSetting extends Setting<boolean> {
    public readonly element: GuiButton;

    public constructor(title: string, width: number, height: number) {
        super();

        const makeText = () => title + ": " + (this.getValue() ? "on" : "off");
        this.element = new GuiButton(makeText(), width, height);

        this.element.on("pointerdown", () => {
            this.setValue(!this.getValue());
            this.element.text = makeText();
        })
    }
}

export abstract class SliderSetting extends Setting<number> {
    public readonly element: GuiSlider;

    public constructor(title: string, min: number, max: number, step: number, width: number, height: number) {
        super();

        const decimals = Math.max(0, -Math.floor(Math.log10(step)));

        const makeText = () => title + ": " + this.getValue().toLocaleString(navigator.language, { minimumFractionDigits: decimals, useGrouping: false });
        this.element = new GuiSlider(min, max, this.getValue(), step, width, height, makeText());

        this.element.addListener("input", () => {
            this.setValue(this.element.value);
            this.element.text = makeText();
        })
    }
}