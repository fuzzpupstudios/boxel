import { BitmapText, Sprite, TextStyle, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/button";
import { GuiInput } from "../../gui/input";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";
import { WorldSelectStage } from "./worldSelectStage";

export class WorldCreateStage extends GameStage {
    private readonly titleText: BitmapText;
    private readonly backButton: GuiButton;
    private readonly createWorldButton: GuiButton;
    private readonly background: Sprite;

    private readonly worldNameInput: GuiInput;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.titleText = new BitmapText({
            text: "Create World",
            style: new TextStyle({
                fill: 0xffffff,
                fontFamily: "BoxelFont",
                align: "center",
                fontSize: 24,
            }),
        });
        this.titleText.anchor.set(0.5);

        this.worldNameInput = new GuiInput("World name", 160, 24);
        this.worldNameInput.pivot.set(80, 12);

        this.backButton = new GuiButton("Back", 100, 30);
        this.backButton.on("pointerdown", () => {
            this.audioManager.playMenuBack();
            this.game.previousStage();
        });

        this.createWorldButton = new GuiButton("Finish", 100, 30);
        this.createWorldButton.on("pointerdown", async () => {
            this.audioManager.playMenuClick();

            const worldSelect = this.game.getActiveStage<WorldSelectStage>(WorldSelectStage);
            if(worldSelect == null) return;

            const id = await worldSelect.createWorld({
                name: this.worldNameInput.value
            });
            if(id == null) return;
            worldSelect.playWorld(id);
        });

        this.updateRequirements();

        this.gui.addChild(
            this.background, this.titleText,
            this.worldNameInput,
            this.backButton, this.createWorldButton
        );
    }

    private updateRequirements() {
        let meetsRequirements = true;

        if(this.worldNameInput.value.replace(/\s\t\r\n/g, "").length === 0) meetsRequirements = false;

        this.createWorldButton.visible = meetsRequirements;
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2 - 60, height - 20);
        this.worldNameInput.position.set(width / 2, 60);
        this.createWorldButton.position.set(width / 2 + 60, height - 20);
        this.background.setSize(width, height);
    }

    public tick(time: Time): void {
        this.updateRequirements();
    }

    public unload(): void {
        
    }
}