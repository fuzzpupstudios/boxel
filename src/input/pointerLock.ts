import { Signal } from "typed-signals";

export class PointerLock {
    public readonly onUnlock = new Signal<() => void>;
    private locked: boolean = false;
    public unadjustedMovement: boolean = true;

    private readonly onPointerLockChange: () => void;

    public constructor(
        public readonly element: HTMLElement
    ) {
        const onPointerLockChange = () => {
            const nowLocked = document.pointerLockElement == this.element;
            const lockChanged = this.locked != nowLocked;
            this.locked = nowLocked;

            if(lockChanged && !this.locked) {
                this.onUnlock.emit();
            }
        };

        document.addEventListener("pointerlockchange", onPointerLockChange);
        this.onPointerLockChange = onPointerLockChange;
    }
    public async lock() {
        if(!this.locked) await this.element.requestPointerLock({ unadjustedMovement: this.unadjustedMovement });
    }
    public unlock() {
        if(this.locked) document.exitPointerLock();
    }
    public isLocked() {
        return this.locked;
    }
    public dispose() {
        this.unlock();

        document.removeEventListener("pointerlockchange", this.onPointerLockChange);
        this.onUnlock.disconnectAll();
    }
}