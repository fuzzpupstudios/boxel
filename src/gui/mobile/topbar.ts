import { ButtonContainer } from "@pixi/ui";
import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";
import { Signal } from "typed-signals";
import { GuiUtils } from "../guiUtils";
import { IconButton } from "../iconButton";

export class Topbar extends Container {
    private readonly pause: ButtonContainer;

    public readonly onPauseDown: Signal<() => void> = new Signal();
    public readonly onPauseUp: Signal<() => void> = new Signal();

    public constructor() {
        const asset = Assets.get("base:ui/d_pad.png");
        
        const pause = new IconButton(new Texture({
            source: asset,
            frame: new Rectangle(48, 0, 16, 16)
        }));
        pause.position.set(0, 0);

        
        super({
            children: [ pause ],
            pivot: { x: 0, y: -8 }
        });

        this.pause = pause;

        GuiUtils.bindButtonSignals(this.pause, this.onPauseDown, this.onPauseUp);
    }

    public setTopbarSize(width: number) {
        this.pause.position.set(width / 2 - 8, 0);
    }
}