import { Vector2 } from "three";

export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
    MOUSE4 = 3,
    MOUSE5 = 4
};

export class Mouse {
    private readonly pressingButtons: Set<MouseButton> = new Set;
    private readonly wasPressedButtons: Set<MouseButton> = new Set;

    private readonly position = new Vector2;
    private readonly deltaPosition = new Vector2;
    private locked: boolean = false;

    public addListeners(element: HTMLElement) {
        element.addEventListener("mousedown", event => {
            this.pressingButtons.add(event.button);
            this.wasPressedButtons.add(event.button);
        });
        element.addEventListener("mouseup", event => {
            this.pressingButtons.delete(event.button);
        });
        element.addEventListener("mousemove", event => {
            this.position.set(event.clientX, event.clientY);
            this.deltaPosition.set(event.movementX, event.movementY);
        })
        element.addEventListener("focusout", () => {
            this.pressingButtons.clear();
            this.wasPressedButtons.clear();
        })
    }

    public isPressed(button: MouseButton) {
        return this.pressingButtons.has(button);
    }

    public wasPressed(button: MouseButton) {
        return this.wasPressedButtons.has(button);
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

    public isLocked() {
        return this.locked;
    }

    public async lock(element: HTMLElement) {
        if(this.locked) return;

        await element.requestPointerLock({
            unadjustedMovement: true
        });

        this.locked = true;
    }
    public pointerLockChange(active: boolean) {
        this.locked = active;
    }

    public update() {
        this.wasPressedButtons.clear();
        this.deltaPosition.set(0, 0);
    }
}