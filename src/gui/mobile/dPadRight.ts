import { ButtonContainer } from "@pixi/ui";
import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";
import { Signal } from "typed-signals";
import { GuiUtils } from "../guiUtils";
import { IconButton } from "../iconButton";

export class GuiDPadRight extends Container {
    public crouch: ButtonContainer;
    public jump: ButtonContainer;
    public nextItem: ButtonContainer;
    public previousItem: ButtonContainer;

    public readonly onCrouchDown: Signal<() => void> = new Signal();
    public readonly onCrouchUp: Signal<() => void> = new Signal();

    public readonly onJumpDown: Signal<() => void> = new Signal();
    public readonly onJumpUp: Signal<() => void> = new Signal();

    public readonly onNextItemDown: Signal<() => void> = new Signal();
    public readonly onNextItemUp: Signal<() => void> = new Signal();

    public readonly onPreviousItemDown: Signal<() => void> = new Signal();
    public readonly onPreviousItemUp: Signal<() => void> = new Signal();

    public constructor() {
        const asset = Assets.get("ui/d_pad");

        const jump = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(16, 16, 16, 16)
        }));
        jump.position.set(-10, 10);

        const crouch = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(32, 32, 16, 16)
        }));
        crouch.position.set(10, 10);

        const nextItem = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(16, 48, 16, 16)
        }));
        nextItem.position.set(10, -10);

        const previousItem = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(0, 48, 16, 16)
        }));
        previousItem.position.set(-10, -10);
        
        super({
            children: [ crouch, jump, nextItem, previousItem ],
            pivot: { x: 24, y: 24 }
        });

        this.crouch = crouch;
        this.jump = jump;
        this.nextItem = nextItem;
        this.previousItem = previousItem;

        GuiUtils.bindButtonSignals(this.crouch, this.onCrouchDown, this.onCrouchUp);
        GuiUtils.bindButtonSignals(this.jump, this.onJumpDown, this.onJumpUp);
        GuiUtils.bindButtonSignals(this.nextItem, this.onNextItemDown, this.onNextItemUp);
        GuiUtils.bindButtonSignals(this.previousItem, this.onPreviousItemDown, this.onPreviousItemUp);
    }
}