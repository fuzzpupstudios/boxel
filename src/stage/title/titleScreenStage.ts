import { Assets, Color, Sprite, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/element/button";
import { IconButton } from "../../gui/element/iconButton";
import { GuiText } from "../../gui/element/text";
import type { Time } from "../../time";
import { CreditsScreenStage } from "../credits/creditsGameStage";
import { GameStage } from "../gameStage";
import { ModManagementGameStage } from "../mods/modManagementGameStage";
import { SettingsScreenStage } from "../settings/settingsGameStage";
import { WorldSelectStage } from "../world/worldSelectStage";

export class TitleScreenStage extends GameStage {
    private readonly titleText: GuiText;
    private readonly versionText: GuiText;
    private readonly watermark: GuiText;
    private readonly playButton: GuiButton;
    private readonly settingsButton: GuiButton;
    private readonly modsButton: GuiButton;
    private readonly creditsButton: GuiButton;
    private readonly fullscreenButton: IconButton;
    private readonly background: Sprite;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;

        this.titleText = new GuiText({
            text: "Boxel",
            fontScale: 2
        });
        this.titleText.setAnchor(0.5, 0.5);

        this.versionText = new GuiText({
            text: "Version " + game.version,
            align: "right"
        });
        this.versionText.setAnchor(1, 1);

        this.watermark = new GuiText({
            text: "Fuzzpup Studios 2026",
            interactive: true
        });
        this.watermark.cursor = "pointer";
        this.watermark.setAnchor(0, 1);

        this.watermark.on("pointerdown", () => {
            window.open("https://github.com/fuzzpupstudios", "_blank")
        })
        this.watermark.on("pointerover", () => {
            this.watermark.fill = new Color(0x8888ff);
        });
        this.watermark.on("pointerout", () => {
            this.watermark.fill = new Color(0xffffff);
        });

        this.playButton = new GuiButton("Play", 100, 30);
        this.playButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new WorldSelectStage(this.game));
        });

        this.settingsButton = new GuiButton("Settings", 100, 30);
        this.settingsButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new SettingsScreenStage(this.game));
        });

        this.modsButton = new GuiButton("Mods", 100, 30);
        this.modsButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new ModManagementGameStage(this.game));
        });

        this.creditsButton = new GuiButton("Credits", 100, 30);
        this.creditsButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new CreditsScreenStage(this.game));
        });

        this.fullscreenButton = new IconButton(
            new Texture(Assets.get("base:ui/fullscreen_button.png"))
        );
        this.fullscreenButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            game.toggleFullscreen();
        });
        if(game.isDesktop) {
            this.fullscreenButton.visible = false;
        }


        this.gui.addChild(
            this.background, this.titleText,
            this.playButton, this.settingsButton, this.modsButton, this.creditsButton,
            this.watermark, this.versionText,
            this.fullscreenButton
        );
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, height / 2 - 50);
        this.playButton.position.set(width / 2, height / 2 + 0);
        this.settingsButton.position.set(width / 2, height / 2 + 32);
        this.modsButton.position.set(width / 2, height / 2 + 64);
        this.creditsButton.position.set(width / 2, height / 2 + 96);
        this.fullscreenButton.position.set(width - 10, 10);
        this.background.setSize(width, height);
        this.watermark.position.set(0, height);
        this.versionText.position.set(width, height);
    }

    public tick(time: Time): void {

    }

    public unload(): void {
        
    }
}