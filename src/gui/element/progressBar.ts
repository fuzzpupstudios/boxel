import { Container, Graphics, Sprite, Texture } from "pixi.js";

export type ProgressBarDirection = "left" | "right" | "up" | "down";

interface ProgressBarContainerOptions {
    emptyTexture?: Texture;
    fillTexture: Texture;
    direction: ProgressBarDirection;
    snap?: number;
}

export class ProgressBarContainer extends Container {
    public readonly fillTexture: Texture;
    public readonly emptyTexture: Texture | null;

    private readonly fillSprite: Sprite;
    private readonly emptySprite: Sprite | null;

    private readonly fillMask: Graphics;
    private readonly emptyMask: Graphics | null;

    private _value: number;
    private _snap: number;
    private _direction: ProgressBarDirection;

    public constructor(options: ProgressBarContainerOptions) {
        const fillMask = new Graphics;
        let emptyMask: Graphics | null = null;

        const fillSprite = new Sprite(options.fillTexture);
        let emptySprite: Sprite | null = null;

        fillSprite.mask = fillMask;

        if(options.emptyTexture != null) {
            emptySprite = new Sprite(options.emptyTexture);
            emptyMask = new Graphics;
            emptySprite.mask = emptyMask;
        }

        const children = [ fillMask, fillSprite ];
        if(emptySprite) children.push(emptySprite)
        if(emptyMask) children.push(emptyMask)
        
        super({ children });
        
        this.emptyTexture = options.emptyTexture ?? null;
        this.fillTexture = options.fillTexture;

        this.emptySprite = emptySprite;
        this.fillSprite = fillSprite;

        this.emptyMask = emptyMask;
        this.fillMask = fillMask;

        this._value = 0.5;
        this._direction = options.direction;
        this._snap = options.snap ?? 0;
        this.updateFill();
    }

    private updateFill() {
        const { width, height } = this.fillTexture;
        
        const snap = this._snap < 1e-64 ? 1e-64 : this._snap;

        if(this._direction == "right") {
            const fill = Math.ceil(width * this._value / snap) * snap;
            this.fillMask.clear()
                .rect(0, 0, fill, height)
                .fill(0xffffff);

            this.emptyMask?.clear()
                .rect(fill, 0, width - fill, height)
                .fill(0xffffff);
        } else if(this._direction == "left") {
            const fill = Math.ceil(width * this._value / snap) * snap;

            this.fillMask.clear()
                .rect(width - fill, 0, fill, height)
                .fill(0xffffff);

            this.emptyMask?.clear()
                .rect(0, 0, width - fill, height)
                .fill(0xffffff);
        } else if(this._direction == "down") {
            const fill = Math.ceil(height * this._value / snap) * snap;

            this.fillMask.clear()
                .rect(0, 0, width, fill)
                .fill(0xffffff);

            this.emptyMask?.clear()
                .rect(0, fill, width, height - fill)
                .fill(0xffffff);
        } else if(this._direction == "up") {
            const fill = Math.ceil(height * this._value / snap) * snap;

            this.fillMask.clear()
                .rect(0, height - fill, width, fill)
                .fill(0xffffff);

            this.emptyMask?.clear()
                .rect(0, 0, width, height - fill)
                .fill(0xffffff);
        }
    }

    public get value() {
        return this._value;
    }
    public set value(value: number) {
        if(value != this._value) {
            this._value = value;
            this.updateFill();
        }
    }

    public get direction() {
        return this._direction;
    }
    public set direction(direction: ProgressBarDirection) {
        if(direction != this._direction) {
            this._direction = direction;
            this.updateFill();
        }
    }

    public get snap() {
        return this._snap;
    }
    public set snap(snap: number) {
        if(snap != this._snap) {
            this._snap = snap;
            this.updateFill();
        }
    }
}