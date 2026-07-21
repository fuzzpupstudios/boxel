import { Container } from "pixi.js";
import type { Time } from "../../time";
import { GuiText } from "../element/text";

interface Stringifyable {
    toString(): string;
}

type Formatter<Args extends Stringifyable[]> = (...data: Args) => string;

export class DebugMenuLine<Args extends Stringifyable[]> {
    public readonly data: Args = new Array(16).fill(0) as Args;
    private nextUpdate: number = 0;
    public visible: boolean = true;

    public constructor(
        public readonly alignment: DebugMenuLineAlignment,
        public readonly updateRate: number,
        public readonly formatter: Formatter<Args>
    ) { }
    
    public hide() {
        this.visible = false;
    }
    public show() {
        this.visible = true;
    }

    public setData(...data: Partial<Args>) {
        for(let i = 0; i < data.length; i++) {
            if(data === undefined) continue;
            this.data[i] = data[i]!;
        }
    }

    public tryUpdate(time: Time) {
        if(time.seconds > this.nextUpdate) {
            this.nextUpdate = time.seconds + this.updateRate;
            return true;
        }

        return false;
    }

    public toString() {
        return this.formatter(...this.data);
    }
}

export enum DebugMenuLineAlignment {
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT
}

export class DebugMenu {
    public readonly view = new Container;

    public readonly lines = new Array<DebugMenuLine<any>>;
    private readonly textLines = new Map<DebugMenuLine<any>, GuiText>;

    public createLine<Args extends Stringifyable[]>(
        align: DebugMenuLineAlignment,
        updateRate: number,
        formatter: Formatter<Args>
    ) {
        const line = new DebugMenuLine<Args>(align, updateRate, formatter);
        this.lines.push(line);

        const textLine = new GuiText({ fontScale: 0.5 });

        if(align == DebugMenuLineAlignment.TOP_LEFT) {
            textLine.setAnchor(0, 0);
            textLine.align = "left";
        }
        if(align == DebugMenuLineAlignment.BOTTOM_LEFT) {
            textLine.setAnchor(0, 1);
            textLine.align = "left";
        }
        if(align == DebugMenuLineAlignment.TOP_RIGHT) {
            textLine.setAnchor(1, 0);
            textLine.align = "right";
        }
        if(align == DebugMenuLineAlignment.BOTTOM_RIGHT) {
            textLine.setAnchor(1, 1);
            textLine.align = "right";
        }

        this.view.addChild(textLine);
        this.textLines.set(line, textLine);

        return line;
    }

    public update(time: Time) {
        if(!this.view.visible) return;

        for(const line of this.lines) {
            const textLine = this.textLines.get(line)!;
            textLine.visible = line.visible;

            if(!line.visible) continue;
            if(!line.tryUpdate(time)) continue;

            textLine.text = line.toString();

        }
    }

    public resize(width: number, height: number) {
        const lineSpacing = 6;

        let topLeft = 0;
        let topRight = 0;
        let bottomLeft = 0;
        let bottomRight = 0;

        const paddingSides = 1;

        for(const line of this.lines) {
            const textLine = this.textLines.get(line)!;

            if(line.alignment == DebugMenuLineAlignment.TOP_LEFT) {
                textLine.position.set(paddingSides, topLeft * lineSpacing);
                topLeft++;
            }
            if(line.alignment == DebugMenuLineAlignment.TOP_RIGHT) {
                textLine.position.set(width - paddingSides, topRight * lineSpacing);
                topRight++;
            }
            if(line.alignment == DebugMenuLineAlignment.BOTTOM_LEFT) {
                textLine.position.set(paddingSides, height - bottomLeft * lineSpacing);
                bottomLeft++;
            }
            if(line.alignment == DebugMenuLineAlignment.BOTTOM_RIGHT) {
                textLine.position.set(width - paddingSides, height - bottomRight * lineSpacing);
                bottomRight++;
            }
        }
    }
}