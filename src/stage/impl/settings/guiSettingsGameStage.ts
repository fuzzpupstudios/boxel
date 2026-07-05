import { Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../../boxel";
import { GuiButton } from "../../../gui/button";
import { ControlBinding } from "../../../input/input";
import type { Time } from "../../../time";
import { GameStage } from "../../gameStage";
import { SliderSetting } from "./elements";
import { GuiDPadLeft } from "../../../gui/mobile/dPadLeft";
import { GuiDPadRight } from "../../../gui/mobile/dPadRight";

export class GuiSettingsScreenStage extends GameStage {
    private readonly titleText: Text;
    private readonly backButton: GuiButton;
    private readonly guiScale: SliderSetting;
    private readonly dpadScale: SliderSetting;
    private readonly background: Sprite;

    private readonly dpadLeftPreview: GuiDPadLeft;
    private readonly dpadRightPreview: GuiDPadRight;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.titleText = new Text({
            text: "Gui Settings",
            style: new TextStyle({
                fill: 0xffffff,
                fontSize: 24,
                align: "center",
            }),
        });
        this.titleText.anchor.set(0.5);

        this.backButton = new GuiButton("Back", 100, 30);

        this.backButton.on("pointerdown", () => {
            this.saveSettings().then(() => {
                this.game.previousStage();
                this.game.updateSettings();
            });
        });

        this.guiScale = new class extends SliderSetting {
            protected override getValue() {
                return game.settings.guiScale;
            }
            protected override setValue(value: number) {
                game.settings.guiScale = value;
            }
        }("GUI Scale", 1, 8, 1, 160, 24);

        const dpadLeftPreview = this.dpadLeftPreview = new GuiDPadLeft;
        this.dpadLeftPreview.scale.set(game.settings.dPadScale);
        dpadLeftPreview.interactive = false;
        dpadLeftPreview.alpha = 0.5;

        const dpadRightPreview = this.dpadRightPreview = new GuiDPadRight;
        this.dpadRightPreview.scale.set(game.settings.dPadScale);
        dpadRightPreview.interactive = false;
        dpadRightPreview.alpha = 0.5;

        this.dpadScale = new class extends SliderSetting {
            protected override getValue() {
                return game.settings.dPadScale;
            }
            protected override setValue(value: number) {
                game.settings.dPadScale = value;
                dpadLeftPreview.scale.set(game.settings.dPadScale);
                dpadRightPreview.scale.set(game.settings.dPadScale);
            }
        }("D-Pad Scale", 0.5, 4, 0.25, 160, 24);

        this.gui.addChild(
            this.background,
            this.dpadLeftPreview,
            this.dpadRightPreview,
            this.titleText,
            this.guiScale.element,
            this.dpadScale.element,
            this.backButton
        );
    }

    public async saveSettings() {
        await this.game.mainStorage?.set("settings", this.game.settings);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2, height - 20);

        this.guiScale.element.position.set(width / 2, 80);
        this.dpadScale.element.position.set(width / 2, 110);

        this.dpadLeftPreview.position.set(0, height);
        this.dpadRightPreview.position.set(width, height);

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