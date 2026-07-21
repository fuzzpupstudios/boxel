import { ButtonContainer } from "@pixi/ui";
import { Assets, Container, Rectangle, Texture } from "pixi.js";
import { Signal } from "typed-signals";
import { IconButton } from "../element/iconButton";
import { GuiUtils } from "../guiUtils";

export class GuiDPadRight extends Container {
    public crouch: ButtonContainer;
    public jump: ButtonContainer;

    public readonly onCrouchDown: Signal<() => void> = new Signal();
    public readonly onCrouchUp: Signal<() => void> = new Signal();

    public readonly onJumpDown: Signal<() => void> = new Signal();
    public readonly onJumpUp: Signal<() => void> = new Signal();

    public constructor() {
        const asset = Assets.get("base:ui/d_pad.png");

        const jump = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(16, 16, 16, 16)
        }));
        jump.position.set(10, -10);

        const crouch = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(32, 32, 16, 16)
        }));
        crouch.position.set(10, 10);
        
        super({
            children: [ crouch, jump ],
            pivot: { x: 24, y: 24 }
        });

        this.crouch = crouch;
        this.jump = jump;

        GuiUtils.bindButtonSignals(this.crouch, this.onCrouchDown, this.onCrouchUp);
        GuiUtils.bindButtonSignals(this.jump, this.onJumpDown, this.onJumpUp);
    }
}