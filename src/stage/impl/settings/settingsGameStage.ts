import { Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../../boxel";
import { GuiButton } from "../../../gui/button";
import { ControlBinding } from "../../../input/input";
import type { Time } from "../../../time";
import { GameStage } from "../../gameStage";
import { SliderSetting, ToggleButtonSetting } from "./elements";
import { VideoSettingsScreenStage } from "./videoSettingsGameStage";
import { ControlSettingsScreenStage } from "./controlSettingsGameStage";
import { GuiSettingsScreenStage } from "./guiSettingsGameStage";

export class SettingsScreenStage extends GameStage {
    private readonly titleText: Text;
    private readonly backButton: GuiButton;
    private readonly videoButton: GuiButton;
    private readonly controlsButton: GuiButton;
    private readonly guiSettingsButton: GuiButton;
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
        this.backButton.on("pointerdown", () => {
            this.audioManager.playMenuBack();
            this.game.previousStage();
        });

        this.videoButton = new GuiButton("Video", 160, 24);
        this.videoButton.on("pointerdown", () => {
            this.audioManager.playMenuClick();
            this.game.changeStage(new VideoSettingsScreenStage(game));
        });

        this.controlsButton = new GuiButton("Control", 160, 24);
        this.controlsButton.on("pointerdown", () => {
            this.audioManager.playMenuClick();
            this.game.changeStage(new ControlSettingsScreenStage(game));
        });

        this.guiSettingsButton = new GuiButton("GUI", 160, 24);
        this.guiSettingsButton.on("pointerdown", () => {
            this.audioManager.playMenuClick();
            this.game.changeStage(new GuiSettingsScreenStage(game));
        });


        this.gui.addChild(
            this.background, this.titleText,
            this.videoButton,
            this.controlsButton,
            this.guiSettingsButton,
            this.backButton
        );
    }

    public async saveSettings() {
        await this.game.mainStorage?.set("settings", this.game.settings);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2, height - 20);

        this.videoButton.position.set(width / 2, height / 2 - 30);
        this.controlsButton.position.set(width / 2, height / 2);
        this.guiSettingsButton.position.set(width / 2, height / 2 + 30);

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