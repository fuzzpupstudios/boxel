import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";
import { MathUtils, Vector2 } from "three";
import type { BoxelGame } from "../boxel";
import type { Time } from "../time";
import { ControllerAxis, ControllerButton } from "../input/controller";

export class GuiControllerCrosshair extends Container {
    public readonly sprite: Sprite;
    public readonly crosshairPosition = new Vector2;
    public readonly usableArea = new Rectangle;
    public controllable: boolean = true;
    public active: boolean = true;
    private dispatchedPointerX = NaN;
    private dispatchedPointerY = NaN;
    private controllerPointerDown = false;

    constructor(
        private readonly game: BoxelGame
    ) {
        const sprite = new Sprite(Assets.get("base:ui/controller_crosshair.png"));
        sprite.anchor.set(0.5);

        super({
            children: [ sprite ]
        });

        this.sprite = sprite;
    }

    public resize(width: number, height: number) {
        this.usableArea.set(0, 0, width, height);
    }

    public disable() {
        this.controllable = false;
        this.active = false;
    }
    public enable() {
        this.controllable = true;
        this.active = true;
    }

    private dispatchPointerEvent(type: "pointerdown" | "pointermove" | "pointerup", buttons: number) {
        const guiScale = this.game.settings.guiScale;
        const canvas = this.game.gui.canvas;
        const bounds = canvas.getBoundingClientRect();

        const clientX = bounds.left + this.crosshairPosition.x * guiScale;
        const clientY = bounds.top + this.crosshairPosition.y * guiScale;

        canvas.dispatchEvent(new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons,
            clientX,
            clientY
        }));
    }

    public update(time: Time) {
        if(this.controllable) {
            this.crosshairPosition.x += this.game.input.getControllerAxis(
                ControllerAxis.LEFT_X,
            ) * time.deltaTime * 200 * this.game.settings.controllerGuiSensitivity;
                
            this.crosshairPosition.y += this.game.input.getControllerAxis(
                ControllerAxis.LEFT_Y,
            ) * time.deltaTime * 200 * this.game.settings.controllerGuiSensitivity;

            this.crosshairPosition.x = MathUtils.clamp(this.crosshairPosition.x, 0, this.usableArea.right);
            this.crosshairPosition.y = MathUtils.clamp(this.crosshairPosition.y, 0, this.usableArea.bottom);
        }

        if(
            this.crosshairPosition.x !== this.dispatchedPointerX ||
            this.crosshairPosition.y !== this.dispatchedPointerY
        ) {
            this.dispatchPointerEvent("pointermove", this.controllerPointerDown ? 1 : 0);
            this.dispatchedPointerX = this.crosshairPosition.x;
            this.dispatchedPointerY = this.crosshairPosition.y;
        }

        for(const controller of this.game.input.controllers.values()) {
            if(controller.wasPressed(ControllerButton.A)) {
                this.controllerPointerDown = true;
                this.dispatchPointerEvent("pointerdown", 1);
            }
            if(controller.wasUnpressed(ControllerButton.A)) {
                this.controllerPointerDown = false;
                this.dispatchPointerEvent("pointerup", 0);
            }
        }

        this.sprite.position.copyFrom(this.crosshairPosition);
        this.sprite.visible = this.active;
    }
}