import { Vector2 } from "three";

export enum MouseButton {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
    MOUSE4 = 3,
    MOUSE5 = 4,
    UNLOCK = 100,
    SCROLL_UP = 101,
    SCROLL_DOWN = 102
};

export class Mouse {
    private readonly pressingButtons: Set<MouseButton> = new Set;
    private readonly wasPressedButtons: Set<MouseButton> = new Set;
    private readonly wasUnpressedButtons: Set<MouseButton> = new Set;

    private readonly position = new Vector2;
    private readonly deltaPosition = new Vector2;
    private locked: boolean = false;
    private element?: HTMLElement;

    public addListeners(element: HTMLElement) {
        this.element = element;
        
        element.addEventListener("mousedown", event => {
            const changed = this.updatePointerLock();
            event.preventDefault();

            if(!changed) {
                this.pressingButtons.add(event.button);
                this.wasPressedButtons.add(event.button);
            }
        });
        element.addEventListener("contextmenu", event => event.preventDefault());
        element.addEventListener("mouseup", event => {
            this.pressingButtons.delete(event.button);
            this.wasUnpressedButtons.add(event.button);
        });
        element.addEventListener("mousemove", event => {
            this.position.set(event.clientX, event.clientY);
            this.deltaPosition.set(event.movementX, event.movementY);
        });
        element.addEventListener("wheel", event => {
            if(event.deltaY > 0) this.wasPressedButtons.add(MouseButton.SCROLL_UP);
            if(event.deltaY < 0) this.wasPressedButtons.add(MouseButton.SCROLL_DOWN);
        });
        element.addEventListener("focusout", () => {
            this.pressingButtons.clear();
            this.wasPressedButtons.clear();

            this.locked = false;
        });
        document.addEventListener("pointerlockchange", () => {
            if(!this.isCurrentlyLocked()) {
                this.wasPressedButtons.add(MouseButton.UNLOCK);
                this.locked = false;
            }
        })
    }

    public updatePointerLock(): boolean {
        if(this.locked) {
            if(!this.isCurrentlyLocked()) {
                this.element!.requestPointerLock().catch(() => {
                    this.locked = false;
                });
                return true;
            }
        } else {
            if(this.isCurrentlyLocked()) {
                document.exitPointerLock();
                return true;
            }
        }
        return false;
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

    public isCurrentlyLocked() {
        return this.element != null && document.pointerLockElement === this.element;
    }
    public isLocked() {
        return this.locked;
    }

    public async lock() {
        this.locked = true;

        this.updatePointerLock();
    }
    public async unlock() {
        this.locked = false;
        
        this.updatePointerLock();
    }

    public update() {
        this.wasUnpressedButtons.clear();
        this.wasPressedButtons.clear();
        this.deltaPosition.set(0, 0);
    }
}