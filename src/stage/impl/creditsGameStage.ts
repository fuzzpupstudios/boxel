import { Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/button";
import { ControlBinding } from "../../input/input";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";

const CREDITS = `
=== Programming ===
lexifuzzpup

=== Game Art ===
lexifuzzpup
AvariceDerg
`

export class CreditsScreenStage extends GameStage {
    private readonly creditsTitle: Text;
    private readonly backButton: GuiButton;
    private readonly background: Sprite;
    private readonly creditsText: Text;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.creditsTitle = new Text({
            text: "Credits",
            style: new TextStyle({
                fill: 0xffffff,
                fontSize: 24,
                align: "center",
            }),
        });
        this.creditsTitle.anchor.set(0.5);

        this.creditsText = new Text({
            text: CREDITS,
            style: new TextStyle({
                fill: 0xffffff,
                fontSize: 12,
                align: "center",
            }),
        });
        this.creditsText.anchor.set(0.5);

        this.backButton = new GuiButton("Back", 100, 30);

        this.backButton.onPress.connect(() => {
            this.saveSettings().then(() => {
                this.game.previousStage();
            });
        });

        this.gui.addChild(
            this.background, this.creditsTitle,
            this.creditsText,
            this.backButton
        );
    }

    public async saveSettings() {
        await this.game.mainStorage?.set("settings", this.game.settings);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.creditsTitle.position.set(width / 2, 20);
        this.backButton.position.set(width / 2, height - 20);
        this.creditsText.position.set(width / 2, height / 2);

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