import { Sprite, Texture } from "pixi.js";
import type { BoxelGame } from "../../../boxel";
import { GuiButton } from "../../../gui/button";
import { GuiText } from "../../../gui/guiText";
import { ControlBinding } from "../../../input/input";
import type { Time } from "../../../time";
import { GameStage } from "../../gameStage";
import { SliderSetting } from "./elements";

export class VideoSettingsScreenStage extends GameStage {
    private readonly titleText: GuiText;
    private readonly backButton: GuiButton;
    private readonly fov: SliderSetting;
    private readonly renderDistance: SliderSetting;
    private readonly background: Sprite;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.titleText = new GuiText({
            text: Math.random() > 0.999 ? "Hideo Settings" : "Video Settings",
            fontScale: 2,
            align: "center"
        });
        this.titleText.setAnchor(0.5);

        this.backButton = new GuiButton("Back", 100, 30);

        this.backButton.on("pointerdown", () => {
            this.game.audioManager.playMenuBack();
            this.saveSettings().then(() => {
                this.game.previousStage();
                this.game.updateSettings();
            });
        });

        this.fov = new class extends SliderSetting {
            protected override getValue() {
                return game.settings.fov;
            }
            protected override setValue(value: number) {
                game.settings.fov = value;
            }
        }("FOV", 10, 160, 1, 200, 24);

        this.renderDistance = new class extends SliderSetting {
            protected override getValue() {
                return game.settings.renderDistance;
            }
            protected override setValue(value: number) {
                game.settings.renderDistance = value;
            }
        }("Render distance", 24, 512, 16, 200, 24);

        this.gui.addChild(
            this.background, this.titleText,
            this.fov.element,
            this.renderDistance.element,
            this.backButton);
    }

    public async saveSettings() {
        await this.game.mainStorage?.set("settings", this.game.settings);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2, height - 20);

        this.fov.element.position.set(width / 2, 80);
        this.renderDistance.element.position.set(width / 2, 110);

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