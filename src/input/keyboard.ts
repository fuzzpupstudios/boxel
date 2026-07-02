export class Keyboard {
    private readonly pressingKeys: Set<string> = new Set;
    private readonly wasPressedKeys: Set<string> = new Set;
    private locked = false;

    public addListeners(element: HTMLElement) {
        element.addEventListener("keydown", event => {
            this.pressingKeys.add(this.translateKey(event.code));
            this.wasPressedKeys.add(this.translateKey(event.code));

            if(this.locked) event.preventDefault();
        });
        element.addEventListener("keyup", event => {
            this.pressingKeys.delete(this.translateKey(event.code));
        });
        element.addEventListener("focusout", () => {
            this.pressingKeys.clear();
            this.wasPressedKeys.clear();
        });
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

    public translateKey(key: string): string {
        if(key == " ") return "space";
        return key.toLowerCase();
    }

    public update() {
        this.wasPressedKeys.clear();
    }
}