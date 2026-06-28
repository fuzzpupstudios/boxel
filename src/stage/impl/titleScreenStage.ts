import { FancyButton } from "@pixi/ui";
import { Sprite, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";
import { PlayingGameStage } from "./playingGameStage";

export class TitleScreenStage extends GameStage {
    private readonly playButton: FancyButton;
    private readonly playLabel: Sprite;

    public constructor(game: BoxelGame) {
        super(game);

        this.playButton = new FancyButton({
            defaultView: this.createButtonView(0x202020),
            hoverView: this.createButtonView(0x2d2d2d),
            pressedView: this.createButtonView(0x141414),
            anchor: 0.5
        });

        this.playLabel = this.createLabelSprite("Play");
        this.playLabel.anchor.set(0.5);
        this.playLabel.width = 120;
        this.playLabel.height = 36;

        this.playButton.onPress.connect(() => {
            this.game.activeStage = new PlayingGameStage(this.game);
            this.game.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
        });

        this.gui.addChild(this.playButton, this.playLabel);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.playButton.position.set(width / 2, height / 2);
        this.playLabel.position.set(width / 2, height / 2);
    }

    public tick(time: Time): void {
        
    }

    private createButtonView(tint: number) {
        const view = Sprite.from(Texture.WHITE);
        view.anchor.set(0.5);
        view.width = 192;
        view.height = 60;
        view.tint = tint;
        return view;
    }

    private createLabelSprite(label: string) {
        const canvas = document.createElement("canvas");
        canvas.width = 384;
        canvas.height = 128;

        const context = canvas.getContext("2d");
        if(context == null) {
            return Sprite.from(Texture.EMPTY);
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff";
        context.font = "700 64px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(label, canvas.width / 2, canvas.height / 2);

        return Sprite.from(canvas);
    }
}