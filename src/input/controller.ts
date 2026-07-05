import { MathUtils } from "three";

export enum ControllerButton {
    A = 0,
    B = 1,
    X = 2,
    Y = 3,

    LEFT_BUMPER = 4,
    RIGHT_BUMPER = 5,
    LEFT_TRIGGER = 6,
    RIGHT_TRIGGER = 7,

    SELECT = 8,
    START = 9,

    LEFT_STICK = 10,
    RIGHT_STICK = 11,

    DPAD_UP = 12,
    DPAD_DOWN = 13,
    DPAD_LEFT = 14,
    DPAD_RIGHT = 15,

    BUTTON_16 = 16,
    BUTTON_17 = 17,
    BUTTON_18 = 18,
    BUTTON_19 = 19,
    BUTTON_20 = 20
}

export enum ControllerAxis {
    LEFT_X = 0,
    LEFT_Y = 1,
    RIGHT_X = 2,
    RIGHT_Y = 3
}

export class Controller {
    public deadzone = 0;
    private gamepad: Gamepad | null = null;
    private readonly pressedButtons = new Set<ControllerButton>;
    private readonly wasPressedButtons = new Set<ControllerButton>;
    private readonly wasUnpressedButtons = new Set<ControllerButton>;

    public setGamepad(gamepad: Gamepad) {
        this.gamepad = gamepad;

        gamepad.buttons
    }
    public setDeadzone(deadzone: number) {
        this.deadzone = deadzone;
    }

    public wasUnpressed(button: ControllerButton) {
        return this.wasUnpressedButtons.has(button);
    }
    public wasPressed(button: ControllerButton) {
        return this.wasPressedButtons.has(button);
    }
    public getButtonValue(button: ControllerButton) {
        return this.gamepad?.buttons[button]?.value ?? 0;
    }
    public getAxis(axis: ControllerAxis) {
        if(this.gamepad == null) return 0;

        let factor = this.gamepad.axes[axis] ?? 0;
        if(Math.abs(factor) < this.deadzone) return 0;

        if(factor > 0) {
            factor = MathUtils.mapLinear(factor, this.deadzone, 1, 0, 1);
        } else if(factor < 0) {
            factor = MathUtils.mapLinear(factor, -1, -this.deadzone, -1, 0);
        }

        if(isNaN(factor)) factor = 0;
        
        return factor;
    }
    public update() {
        if(this.gamepad == null) return;

        this.wasUnpressedButtons.clear();
        this.wasPressedButtons.clear();

        for(const [ id, button ] of this.gamepad.buttons.entries()) {
            if(button.value > 0.1) {
                if(!this.pressedButtons.has(id)) {
                    this.pressedButtons.add(id);
                    this.wasPressedButtons.add(id);
                }
            } else {
                if(this.pressedButtons.has(id)) {
                    this.pressedButtons.delete(id);
                    this.wasUnpressedButtons.add(id);
                }
            }
        }
    }
}