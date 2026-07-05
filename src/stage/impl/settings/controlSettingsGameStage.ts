import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../../boxel";
import { GuiButton } from "../../../gui/button";
import { ControlBinding } from "../../../input/input";
import type { Time } from "../../../time";
import { GameStage } from "../../gameStage";
import { GuiSlider } from "../../../gui/slider";
import { SliderSetting, ToggleButtonSetting } from "./elements";

export class ControlSettingsScreenStage extends GameStage {
    private readonly titleText: Text;
    private readonly backButton: GuiButton;
    private readonly mouseSensitivity: SliderSetting;
    private readonly controllerSensitivity: SliderSetting;
    private readonly controllerGuiSensitivity: SliderSetting;
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
            text: "Control Settings",
            style: new TextStyle({
                fill: 0xffffff,
                fontSize: 24,
                align: "center",
            }),
        });
        this.titleText.anchor.set(0.5);

        this.backButton = new GuiButton("Back", 100, 30);

        this.backButton.on("pointerdown", () => {
            this.saveSettings().then(() => {
                this.game.previousStage();
                this.game.updateSettings();
            });
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

        this.controllerGuiSensitivity = new class extends SliderSetting {
            protected override getValue() {
                return game.settings.controllerGuiSensitivity;
            }
            protected override setValue(value: number) {
                game.settings.controllerGuiSensitivity = value;
            }
        }("Controller GUI sensitivity", 0.1, 5.0, 0.1, 160, 24);

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
        }("Controller deadzone", 0, 0.9, 0.01, 160, 24);

        this.gui.addChild(
            this.background, this.titleText,
            this.mouseSensitivity.element,
            this.controllerSensitivity.element,
            this.controllerGuiSensitivity.element,
            this.invertX.element,
            this.invertY.element,
            this.controllerDeadzone.element,
            this.backButton
        );
    }

    public async saveSettings() {
        await this.game.mainStorage?.set("settings", this.game.settings);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2, height - 20);

        this.mouseSensitivity.element.position.set(width / 2, 50);
        this.controllerSensitivity.element.position.set(width / 2, 80);
        this.controllerGuiSensitivity.element.position.set(width / 2, 110);
        this.invertX.element.position.set(width / 2 - 41, 140);
        this.invertY.element.position.set(width / 2 + 41, 140);
        this.controllerDeadzone.element.position.set(width / 2, 170);

        this.background.setSize(width, height);
    }

    public tick(time: Time): void {
        if(this.game.input.wasPressed(ControlBinding.BACK)) {
            this.game.previousStage();
        }
    }

    public unload(): void {
        
    }
}