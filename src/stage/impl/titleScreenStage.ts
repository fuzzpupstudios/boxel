import { ButtonContainer } from "@pixi/ui";
import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import type { Time } from "../../time";
import { PlayingGameStage } from "./playingGameStage";
import { GameStage } from "../gameStage";
import { GuiButton } from "../../gui/button";

export class TitleScreenStage extends GameStage {
    private readonly titleText: Text;
    private readonly playButton: GuiButton;
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

        this.playButton.onPress.connect(() => {
            this.game.changeStage(new PlayingGameStage(this.game));
        });

        this.gui.addChild(this.background, this.titleText, this.playButton);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, height / 2 - 40);
        this.playButton.position.set(width / 2, height / 2 + 20);
        this.background.setSize(width, height);
    }

    public tick(time: Time): void {

    }
}