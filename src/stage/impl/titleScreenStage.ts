import { ButtonContainer } from "@pixi/ui";
import { Assets, Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import type { Time } from "../../time";
import { PlayingGameStage } from "./playingGameStage";
import { GameStage } from "../gameStage";
import { GuiButton } from "../../gui/button";
import { SettingsScreenStage } from "./settings/settingsGameStage";
import { CreditsScreenStage } from "./creditsGameStage";
import { IconButton } from "../../gui/iconButton";

export class TitleScreenStage extends GameStage {
    private readonly titleText: Text;
    private readonly playButton: GuiButton;
    private readonly settingsButton: GuiButton;
    private readonly creditsButton: GuiButton;
    private readonly fullscreenButton: IconButton;
    private readonly background: Sprite;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;

        this.titleText = new Text({
            text: "Boxel",
            style: new TextStyle({
                fill: 0xffffff,
                fontSize: 24,
                align: "center",
            }),
        });
        this.titleText.anchor.set(0.5);

        this.playButton = new GuiButton("Play", 100, 30);
        this.playButton.on("pointerdown", () => {
            this.game.changeStage(new PlayingGameStage(this.game), false);
        });

        this.settingsButton = new GuiButton("Settings", 100, 30);
        this.settingsButton.on("pointerdown", () => {
            this.game.changeStage(new SettingsScreenStage(this.game));
        });

        this.creditsButton = new GuiButton("Credits", 100, 30);
        this.creditsButton.on("pointerdown", () => {
            this.game.changeStage(new CreditsScreenStage(this.game));
        });

        this.fullscreenButton = new IconButton(
            new Texture(Assets.get("ui/fullscreen_button"))
        );
        this.fullscreenButton.on("pointerdown", () => {
            game.toggleFullscreen();
        });
        if(game.isOnDesktop()) {
            this.fullscreenButton.visible = false;
        }


        this.gui.addChild(
            this.background, this.titleText,
            this.playButton, this.settingsButton, this.creditsButton,
            this.fullscreenButton
        );
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, height / 2 - 40);
        this.playButton.position.set(width / 2, height / 2 + 10);
        this.settingsButton.position.set(width / 2, height / 2 + 42);
        this.creditsButton.position.set(width / 2, height / 2 + 74);
        this.fullscreenButton.position.set(width - 10, 10);
        this.background.setSize(width, height);
    }

    public tick(time: Time): void {

    }

    public unload(): void {
        
    }
}