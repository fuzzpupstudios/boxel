import { Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/button";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";
import { PlayingGameStage } from "./playingGameStage";
import { TitleScreenStage } from "./titleScreenStage";

export class SettingsScreenStage extends GameStage {
    private readonly titleText: Text;
    private readonly backButton: GuiButton;
    private readonly background: Sprite;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;

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

        this.gui.addChild(this.background, this.titleText, this.backButton);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2, height - 20);
        this.background.setSize(width, height);
    }

    public tick(time: Time): void {

    }
}