import { Sprite, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/element/button";
import { GuiText } from "../../gui/element/text";
import { ControlBinding } from "../../input/input";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";
import { CycleButtonSetting } from "./elements";

export class PerformanceSettingsScreenStage extends GameStage {
    private readonly titleText: GuiText;
    private readonly backButton: GuiButton;
    private readonly maxChunkUpdates: CycleButtonSetting<number>;
    private readonly maxChunkLoads: CycleButtonSetting<number>;
    private readonly maxColumnGenerations: CycleButtonSetting<number>;
    private readonly background: Sprite;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.titleText = new GuiText({
            text: "Performance Settings",
            fontScale: 2,
            align: "center"
        });
        this.titleText.setAnchor(0.5);

        this.backButton = new GuiButton("Back", 100, 30);

        this.backButton.on("pointerdown", () => {
            this.game.audioManager.playMenuBack();
            this.saveSettings().then(() => {
                this.game.previousStage();
                this.game.updateSettings();
            });
        });

        this.maxChunkUpdates = new class extends CycleButtonSetting<number> {
            protected override getValue() {
                return game.settings.maxChunkUpdates;
            }
            protected override setValue(value: number) {
                game.settings.maxChunkUpdates = value;
            }
        }("Max Chunk Updates", 200, 24, [ 1, 2, 4, 8, 16, 32, 64, 128, 4096 ]);

        this.maxChunkLoads = new class extends CycleButtonSetting<number> {
            protected override getValue() {
                return game.settings.maxColumnLoads;
            }
            protected override setValue(value: number) {
                game.settings.maxColumnLoads = value;
            }
        }("Max Column Loads", 200, 24, [ 1, 2, 8, 32, 128 ]);

        this.maxColumnGenerations = new class extends CycleButtonSetting<number> {
            protected override getValue() {
                return game.settings.maxColumnGenerations;
            }
            protected override setValue(value: number) {
                game.settings.maxColumnGenerations = value;
            }
        }("Max Column Generations", 200, 24, [ 1, 2, 4, 8 ]);

        this.gui.addChild(
            this.background, this.titleText,
            this.maxChunkUpdates.element,
            this.maxChunkLoads.element,
            this.maxColumnGenerations.element,
            this.backButton);
    }

    public async saveSettings() {
        await this.game.mainStorage?.set("settings", this.game.settings);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2, height - 20);

        this.maxChunkUpdates.element.position.set(width / 2, 80);
        this.maxChunkLoads.element.position.set(width / 2, 110);
        this.maxColumnGenerations.element.position.set(width / 2, 140);

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