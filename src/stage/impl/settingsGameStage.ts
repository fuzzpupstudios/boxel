import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/button";
import { ControlBinding } from "../../input/input";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";
import { GuiSlider } from "../../gui/slider";

abstract class Setting<T> {
    public abstract element: Container;
    protected abstract getValue(): T;
    protected abstract setValue(value: T): void;
}

abstract class ToggleButtonSetting extends Setting<boolean> {
    public readonly element: GuiButton;

    public constructor(title: string, width: number, height: number) {
        super();

        const makeText = () => title + ": " + (this.getValue() ? "on" : "off");
        this.element = new GuiButton(makeText(), width, height);

        this.element.onPress.connect(() => {
            this.setValue(!this.getValue());
            this.element.text = makeText();
        })
    }
}

abstract class SliderSetting extends Setting<number> {
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

export class SettingsScreenStage extends GameStage {
    private readonly titleText: Text;
    private readonly backButton: GuiButton;
    private readonly mouseSensitivity: SliderSetting;
    private readonly controllerSensitivity: SliderSetting;
    private readonly invertX: ToggleButtonSetting;
    private readonly invertY: ToggleButtonSetting;
    private readonly controllerDeadzone: SliderSetting;
    private readonly background: Sprite;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.titleText = new Text({
            text: "Settings",
            style: new TextStyle({
                fill: 0xffffff,
                fontSize: 24,
                align: "center",
            }),
        });
        this.titleText.anchor.set(0.5);

        this.backButton = new GuiButton("Back", 100, 30);

        this.backButton.onPress.connect(() => {
            this.game.previousStage();
        });

        this.mouseSensitivity = new class extends SliderSetting {
            protected override getValue() {
                return game.settings.mouseSensitivity;
            }
            protected override setValue(value: number) {
                game.settings.mouseSensitivity = value;
            }
        }("Mouse sensitivity", 0.1, 5.0, 0.1, 160, 24);

        this.controllerSensitivity = new class extends SliderSetting {
            protected override getValue() {
                return game.settings.controllerSensitivity;
            }
            protected override setValue(value: number) {
                game.settings.controllerSensitivity = value;
            }
        }("Controller sensitivity", 0.1, 5.0, 0.1, 160, 24);

        this.invertX = new class extends ToggleButtonSetting {
            protected override getValue() {
                return game.settings.invertX;
            }
            protected override setValue(value: boolean) {
                game.settings.invertX = value;
            }
        }("Invert X", 78, 24);

        this.invertY = new class extends ToggleButtonSetting {
            protected override getValue() {
                return game.settings.invertY;
            }
            protected override setValue(value: boolean) {
                game.settings.invertY = value;
            }
        }("Invert Y", 78, 24);

        this.controllerDeadzone = new class extends SliderSetting {
            protected override getValue() {
                return game.settings.controllerDeadzone;
            }
            protected override setValue(value: number) {
                game.settings.controllerDeadzone = value;
            }
        }("Controller deadzone", 0, 1.0, 0.01, 160, 24);

        this.gui.addChild(
            this.background, this.titleText,
            this.mouseSensitivity.element,
            this.controllerSensitivity.element,
            this.invertX.element,
            this.invertY.element,
            this.controllerDeadzone.element,
            this.backButton);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2, height - 20);
        this.mouseSensitivity.element.position.set(width / 2, height / 2 - 40);
        this.controllerSensitivity.element.position.set(width / 2, height / 2 - 10);
        this.invertX.element.position.set(width / 2 - 41, height / 2 + 20);
        this.invertY.element.position.set(width / 2 + 41, height / 2 + 20);
        this.controllerDeadzone.element.position.set(width / 2, height / 2 + 50);
        this.background.setSize(width, height);
    }

    public tick(time: Time): void {
        if(this.game.input.wasPressed(ControlBinding.BACK)) {
            this.game.previousStage();
        }
    }
}