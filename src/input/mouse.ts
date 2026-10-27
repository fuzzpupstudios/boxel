import { Vector2 } from "three";

export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
    MOUSE4 = 3,
    MOUSE5 = 4,
    SCROLL_UP = 101,
    SCROLL_DOWN = 102
};

export class Mouse {
    private readonly pressingButtons: Set<MouseButton> = new Set;
    private readonly wasPressedButtons: Set<MouseButton> = new Set;
    private readonly wasUnpressedButtons: Set<MouseButton> = new Set;

    private readonly position = new Vector2;
    private readonly deltaPosition = new Vector2;
    private element?: HTMLElement;
    private readonly onMouseDownEvents = new Map<HTMLElement, (event: MouseEvent) => void>;
    private readonly onMouseUpEvents = new Map<HTMLElement, (event: MouseEvent) => void>;
    private readonly onMouseMoveEvents = new Map<HTMLElement, (event: MouseEvent) => void>;
    private readonly onContextMenuEvents = new Map<HTMLElement, (event: MouseEvent) => void>;
    private readonly onWheelEvents = new Map<HTMLElement, (event: WheelEvent) => void>;

    public addListeners(element: HTMLElement) {
        this.element = element;

        const onMouseDown = (event: MouseEvent) => {
            this.pressingButtons.add(event.button);
            this.wasPressedButtons.add(event.button);
        };
        const onMouseUp = (event: MouseEvent) => {
            this.pressingButtons.delete(event.button);
            this.wasUnpressedButtons.add(event.button);
        };
        const onMouseMove = (event: MouseEvent) => {
            this.position.set(event.clientX, event.clientY);
            this.deltaPosition.set(event.movementX, event.movementY);
        };
        const onContextMenu = (event: MouseEvent) => event.preventDefault();

        const onWheel = (event: WheelEvent) => {
            if(event.deltaY > 0) this.wasPressedButtons.add(MouseButton.SCROLL_UP);
            if(event.deltaY < 0) this.wasPressedButtons.add(MouseButton.SCROLL_DOWN);
        }
        
        element.addEventListener("mousedown", onMouseDown);
        element.addEventListener("mouseup", onMouseUp);
        element.addEventListener("mousemove", onMouseMove);
        element.addEventListener("contextmenu", onContextMenu);
        element.addEventListener("wheel", onWheel);

        this.onMouseDownEvents.set(element, onMouseDown);
        this.onMouseUpEvents.set(element, onMouseUp);
        this.onMouseMoveEvents.set(element, onMouseMove);
        this.onContextMenuEvents.set(element, onContextMenu);
        this.onWheelEvents.set(element, onWheel);
    }

    public removeAllListeners() {
        for(const [ element, onMouseDown ] of this.onMouseDownEvents) {
            element.removeEventListener("mousedown", onMouseDown);
        }
        for(const [ element, onMouseUp ] of this.onMouseUpEvents) {
            element.removeEventListener("mouseup", onMouseUp);
        }
        for(const [ element, onMouseMove ] of this.onMouseMoveEvents) {
            element.removeEventListener("mousemove", onMouseMove);
        }
        for(const [ element, onContextMenu ] of this.onContextMenuEvents) {
            element.removeEventListener("contextmenu", onContextMenu);
        }
        for(const [ element, onWheel ] of this.onWheelEvents) {
            element.removeEventListener("wheel", onWheel);
        }
    }

    public isPressed(button: MouseButton) {
        return this.pressingButtons.has(button);
    }

    public wasPressed(button: MouseButton) {
        return this.wasPressedButtons.has(button);
    }

    public wasUnpressed(button: MouseButton) {
        return this.wasUnpressedButtons.has(button);
    }

    public get x() {
        return this.position.x;
    }
    public get y() {
        return this.position.y;
    }
    public get dx() {
        return this.deltaPosition.x;
    }
    public get dy() {
        return this.deltaPosition.y;
    }
    public getPosition(out: Vector2 = new Vector2) {
        return out.copy(this.position);
    }
    public getDeltaPosition(out: Vector2 = new Vector2) {
        return out.copy(this.deltaPosition);
    }

    public clearAll() {
        this.pressingButtons.clear();
        this.wasPressedButtons.clear();
    }

    public update() {
        this.wasUnpressedButtons.clear();
        this.wasPressedButtons.clear();
        this.deltaPosition.set(0, 0);
    }
}