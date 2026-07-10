import { ButtonContainer } from "@pixi/ui";
import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";
import { Signal } from "typed-signals";
import { GuiUtils } from "../guiUtils";
import { IconButton } from "../iconButton";

export class GuiDPadLeft extends Container {
    public forward: ButtonContainer;
    public forwardLeft: ButtonContainer;
    public forwardRight: ButtonContainer;
    public backward: ButtonContainer;
    public left: ButtonContainer;
    public right: ButtonContainer;
    public jump: ButtonContainer;

    public readonly onForwardDown: Signal<() => void> = new Signal();
    public readonly onForwardUp: Signal<() => void> = new Signal();

    public readonly onBackwardDown: Signal<() => void> = new Signal();
    public readonly onBackwardUp: Signal<() => void> = new Signal();

    public readonly onLeftDown: Signal<() => void> = new Signal();
    public readonly onLeftUp: Signal<() => void> = new Signal();

    public readonly onRightDown: Signal<() => void> = new Signal();
    public readonly onRightUp: Signal<() => void> = new Signal();

    public readonly onJumpDown: Signal<() => void> = new Signal();
    public readonly onJumpUp: Signal<() => void> = new Signal();

    public constructor() {
        const asset = Assets.get("base:ui/d_pad.png");

        const jump = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(16, 16, 16, 16)
        }));
        jump.position.set(0, 0);

        const forward = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(16, 0, 16, 16)
        }));
        forward.position.set(0, -20);

        const forwardLeft = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(0, 0, 16, 16)
        }));
        forwardLeft.position.set(-20, -20);

        const forwardRight = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(32, 0, 16, 16)
        }));
        forwardRight.position.set(20, -20);

        const backward = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(16, 32, 16, 16)
        }));
        backward.position.set(0, 20);

        const left = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(0, 16, 16, 16)
        }));
        left.position.set(-20, 0);

        const right = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(32, 16, 16, 16)
        }));
        right.position.set(20, 0);
        
        super({
            children: [ forward, forwardLeft, forwardRight, backward, left, right, jump ],
            pivot: { x: -32, y: 32 },
            interactive: true
        });

        this.forward = forward;
        this.forwardLeft = forwardLeft;
        this.forwardRight = forwardRight;
        this.backward = backward;
        this.left = left;
        this.right = right;
        this.jump = jump;

        GuiUtils.bindButtonSignals(this.forward, this.onForwardDown, this.onForwardUp);
        GuiUtils.bindButtonSignals(this.backward, this.onBackwardDown, this.onBackwardUp);
        GuiUtils.bindButtonSignals(this.left, this.onLeftDown, this.onLeftUp);
        GuiUtils.bindButtonSignals(this.right, this.onRightDown, this.onRightUp);
        GuiUtils.bindButtonSignals(this.jump, this.onJumpDown, this.onJumpUp);
    }
}