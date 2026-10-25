export class Keyboard {
    private readonly pressingKeys: Set<string> = new Set;
    private readonly wasPressedKeys: Set<string> = new Set;
    private readonly wasUnpressedKeys: Set<string> = new Set;
    private locked = false;
    private readonly keyDownEvents = new Map<HTMLElement, (event: KeyboardEvent) => void>;
    private readonly keyUpEvents = new Map<HTMLElement, (event: KeyboardEvent) => void>;

    public addListeners(element: HTMLElement) {
        const onKeyDown = (event: KeyboardEvent) => {
            if(event.repeat) return;
            
            this.pressingKeys.add(this.translateKey(event.code));
            this.wasPressedKeys.add(this.translateKey(event.code));

            if(this.locked) event.preventDefault();
        }
        const onKeyUp = (event: KeyboardEvent) => {
            this.pressingKeys.delete(this.translateKey(event.code));
            this.wasUnpressedKeys.add(this.translateKey(event.code));
        }
        element.addEventListener("keydown", onKeyDown);
        element.addEventListener("keyup", onKeyUp);

        this.keyDownEvents.set(element, onKeyDown);
        this.keyUpEvents.set(element, onKeyUp);
    }

    public removeAllListeners() {
        for(const [ element, onKeyDown ] of this.keyDownEvents) {
            element.removeEventListener("keydown", onKeyDown);
        }
        for(const [ element, onKeyUp ] of this.keyUpEvents) {
            element.removeEventListener("keydown", onKeyUp);
        }
    }

    public lock() {
        (<any>navigator)?.keyboard?.lock?.();
        this.locked = true;
    }

    public unlock() {
        (<any>navigator)?.keyboard?.unlock?.();
        this.locked = false;
    }

    public isPressed(key: string) {
        return this.pressingKeys.has(this.translateKey(key));
    }

    public wasPressed(key: string) {
        return this.wasPressedKeys.has(this.translateKey(key));
    }

    public wasUnpressed(key: string) {
        return this.wasUnpressedKeys.has(this.translateKey(key));
    }

    public translateKey(key: string): string {
        if(key == " ") return "space";
        return key.toLowerCase();
    }

    public clearAll() {
        this.pressingKeys.clear();
        this.wasPressedKeys.clear();
    }

    public update() {
        this.wasUnpressedKeys.clear();
        this.wasPressedKeys.clear();
    }
}