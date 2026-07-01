import { ButtonContainer } from "@pixi/ui";
import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import type { Time } from "../../time";
import { PlayingGameStage } from "./playingGameStage";
import { GameStage } from "../gameStage";
import { GuiButton } from "../../gui/button";
import { SettingsScreenStage } from "./settingsGameStage";

export class TitleScreenStage extends GameStage {
    private readonly titleText: Text;
    private readonly playButton: GuiButton;
    private readonly settingsButton: GuiButton;
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
        this.settingsButton = new GuiButton("Settings", 100, 30);

        this.playButton.onPress.connect(() => {
            this.game.changeStage(new PlayingGameStage(this.game), false);
        });
        this.settingsButton.onPress.connect(() => {
            this.game.changeStage(new SettingsScreenStage(this.game));
        });

        this.gui.addChild(this.background, this.titleText, this.playButton, this.settingsButton);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, height / 2 - 40);
        this.playButton.position.set(width / 2, height / 2 + 10);
        this.settingsButton.position.set(width / 2, height / 2 + 42);
        this.background.setSize(width, height);
    }

    public tick(time: Time): void {

    }

    public unload(): void {
        
    }
}