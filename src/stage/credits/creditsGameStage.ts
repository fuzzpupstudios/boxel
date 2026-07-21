import { Sprite, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/element/button";
import { GuiText } from "../../gui/element/text";
import { ControlBinding } from "../../input/input";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";

const CREDITS = `
=== Programming ===
lexifuzzpup

=== Game Art ===
lexifuzzpup
AvariceDerg


Code licensed under PolyForm Noncommercial 1.0.0
Assets/content licensed under CC BY-NC 4.0
Third-party libraries licensed separately under their own licensing agreement
`

export class CreditsScreenStage extends GameStage {
    private readonly creditsTitle: GuiText;
    private readonly creditsText: GuiText;
    private readonly backButton: GuiButton;
    private readonly background: Sprite;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.creditsTitle = new GuiText({
            text: "Credits",
            align: "center",
            fontScale: 2
        });
        this.creditsTitle.setAnchor(0.5, 0.5);

        this.creditsText = new GuiText({
            text: CREDITS,
            align: "center"
        });
        this.creditsText.setAnchor(0.5, 0.5);

        this.backButton = new GuiButton("Back", 100, 30);

        this.backButton.on("pointerdown", () => {
            this.game.audioManager.playMenuBack();
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