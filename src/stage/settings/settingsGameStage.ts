import { Sprite, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/element/button";
import { GuiText } from "../../gui/element/text";
import { ControlBinding } from "../../input/input";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";
import { ControlSettingsScreenStage } from "./controlSettingsGameStage";
import { GuiSettingsScreenStage } from "./guiSettingsGameStage";
import { PerformanceSettingsScreenStage } from "./performanceSettingsGameStage";
import { VideoSettingsScreenStage } from "./videoSettingsGameStage";

export class SettingsScreenStage extends GameStage {
    private readonly titleText: GuiText;
    private readonly backButton: GuiButton;
    private readonly videoButton: GuiButton;
    private readonly controlsButton: GuiButton;
    private readonly guiSettingsButton: GuiButton;
    private readonly performanceButton: GuiButton;
    private readonly background: Sprite;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.titleText = new GuiText({
            text: "Settings",
            fontScale: 2,
            align: "center"
        });
        this.titleText.setAnchor(0.5);

        this.backButton = new GuiButton("Back", 100, 30);
        this.backButton.on("pointerdown", () => {
            this.game.audioManager.playMenuBack();
            this.game.previousStage();
        });

        this.videoButton = new GuiButton("Video", 160, 24);
        this.videoButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new VideoSettingsScreenStage(game));
        });

        this.controlsButton = new GuiButton("Control", 160, 24);
        this.controlsButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new ControlSettingsScreenStage(game));
        });

        this.guiSettingsButton = new GuiButton("GUI", 160, 24);
        this.guiSettingsButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new GuiSettingsScreenStage(game));
        });

        this.performanceButton = new GuiButton("Performance", 160, 24);
        this.performanceButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new PerformanceSettingsScreenStage(game));
        });


        this.gui.addChild(
            this.background, this.titleText,
            this.videoButton,
            this.controlsButton,
            this.guiSettingsButton,
            this.performanceButton,
            this.backButton
        );
    }

    public async saveSettings() {
        await this.game.mainStorage?.set("settings", this.game.settings);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2, height - 20);

        this.videoButton.position.set(width / 2, height / 2 - 45);
        this.controlsButton.position.set(width / 2, height / 2 - 15);
        this.guiSettingsButton.position.set(width / 2, height / 2 + 15);
        this.performanceButton.position.set(width / 2, height / 2 + 45);

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