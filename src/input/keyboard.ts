export class Keyboard {
    private readonly pressingKeys: Set<string> = new Set;
    private readonly wasPressedKeys: Set<string> = new Set;
    private readonly wasUnpressedKeys: Set<string> = new Set;
    private locked = false;

    public addListeners(element: HTMLElement) {
        element.addEventListener("keydown", event => {
            if(event.repeat) return;
            
            this.pressingKeys.add(this.translateKey(event.code));
            this.wasPressedKeys.add(this.translateKey(event.code));

            if(this.locked) event.preventDefault();
        });
        element.addEventListener("keyup", event => {
            this.pressingKeys.delete(this.translateKey(event.code));
            this.wasUnpressedKeys.add(this.translateKey(event.code));
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