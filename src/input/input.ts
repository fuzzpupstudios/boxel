import { AXES, BUTTONS, GamepadWrapper } from "gamepad-wrapper";
import { Keyboard } from "./keyboard";
import { Mouse, MouseButton } from "./mouse";
import { MathUtils } from "three";

export enum ControlBinding {
    RIGHT, LEFT, FORWARD, BACKWARD,
    JUMP, CROUCH, TOGGLE_CROUCH, SPRINT,

    DESTROY, USE, PICK_BLOCK,

    ROTATE_CW, ROTATE_CCW,
    ROTATE_UP, ROTATE_DOWN,
    CHANGE_PERSPECTIVE,

    NEXT_ITEM, PREVIOUS_ITEM,

    PAUSE, BACK
}

export enum GamepadAxis {
    LEFT_X, LEFT_Y,
    RIGHT_X, RIGHT_Y,
}

export enum MouseAxis {
    X, Y,
    DELTA_X, DELTA_Y
}

export class Input {
    public keyboard: Keyboard | null = null;
    public mouse: Mouse | null = null;
    public readonly gamepads: Map<Gamepad, GamepadWrapper> = new Map;

    public readonly keyBindings: Partial<Record<ControlBinding, string>> = {
        [ControlBinding.RIGHT]: "KeyD",
        [ControlBinding.LEFT]: "KeyA",
        [ControlBinding.FORWARD]: "KeyW",
        [ControlBinding.BACKWARD]: "KeyS",

        [ControlBinding.DESTROY]: "KeyR",
        [ControlBinding.USE]: "KeyF",

        [ControlBinding.ROTATE_CW]: "ArrowRight",
        [ControlBinding.ROTATE_CCW]: "ArrowLeft",
        [ControlBinding.ROTATE_UP]: "ArrowUp",
        [ControlBinding.ROTATE_DOWN]: "ArrowDown",
        
        [ControlBinding.CROUCH]: "ShiftLeft",
        [ControlBinding.SPRINT]: "ControlLeft",

        [ControlBinding.JUMP]: "Space",
        [ControlBinding.CHANGE_PERSPECTIVE]: "G",

        [ControlBinding.NEXT_ITEM]: "BracketRight",
        [ControlBinding.PREVIOUS_ITEM]: "BracketLeft",

        [ControlBinding.PAUSE]: "Escape",
        [ControlBinding.BACK]: "Escape"
    };
    public readonly controllerBindings: Partial<Record<ControlBinding, string>> = {
        [ControlBinding.JUMP]: BUTTONS.STANDARD.RC_BOTTOM,
        [ControlBinding.CHANGE_PERSPECTIVE]: BUTTONS.STANDARD.LC_TOP,

        [ControlBinding.DESTROY]: BUTTONS.STANDARD.TRIGGER_RIGHT,
        [ControlBinding.USE]: BUTTONS.STANDARD.TRIGGER_LEFT,

        [ControlBinding.PAUSE]: BUTTONS.STANDARD.CC_RIGHT,
        [ControlBinding.BACK]: BUTTONS.STANDARD.RC_RIGHT,

        [ControlBinding.NEXT_ITEM]: BUTTONS.STANDARD.BUMPER_RIGHT,
        [ControlBinding.PREVIOUS_ITEM]: BUTTONS.STANDARD.BUMPER_LEFT,

        [ControlBinding.TOGGLE_CROUCH]: BUTTONS.STANDARD.THUMBSTICK_LEFT,
        [ControlBinding.PICK_BLOCK]: BUTTONS.STANDARD.THUMBSTICK_RIGHT
    };
    public readonly mouseBindings: Partial<Record<ControlBinding, MouseButton>> = {
        [ControlBinding.DESTROY]: MouseButton.LEFT,
        [ControlBinding.USE]: MouseButton.RIGHT,
        [ControlBinding.PAUSE]: MouseButton.UNLOCK,
        [ControlBinding.NEXT_ITEM]: MouseButton.SCROLL_UP,
        [ControlBinding.PREVIOUS_ITEM]: MouseButton.SCROLL_DOWN,
        [ControlBinding.PICK_BLOCK]: MouseButton.MIDDLE,
    };

    public attachKeyboard(body: HTMLElement) {
        this.keyboard = new Keyboard;
        this.keyboard.addListeners(body);
    }
    public attachController(controller: Gamepad) {
        const wrapper = new GamepadWrapper(controller);
        this.gamepads.set(controller, wrapper);
    }
    public detachController(controller: Gamepad) {
        this.gamepads.delete(controller);
    }
    public attachMouse(body: HTMLElement) {
        this.mouse = new Mouse;
        this.mouse.addListeners(body);
    }

    public isPressed(binding: ControlBinding): boolean {
        return this.getAnalog(binding) > 0.5;
    }
    public wasPressed(binding: ControlBinding): boolean {
        if(this.keyboard != null) {
            if(binding in this.keyBindings) {
                if(this.keyboard.wasPressed(this.keyBindings[binding]!)) return true;
            }
        }
        if(this.mouse != null) {
            if(binding in this.mouseBindings) {
                if(this.mouse.wasPressed(this.mouseBindings[binding]!)) return true;
            }
        }
        for(const gamepad of this.gamepads.values()) {
            if(binding in this.controllerBindings) {
                if(gamepad.getButtonDown(this.controllerBindings[binding]!)) return true;
            }
        }
        return false;
    }
    public wasUnpressed(binding: ControlBinding): boolean {
        if(this.keyboard != null) {
            if(binding in this.keyBindings) {
                if(this.keyboard.wasUnpressed(this.keyBindings[binding]!)) return true;
            }
        }
        if(this.mouse != null) {
            if(binding in this.mouseBindings) {
                if(this.mouse.wasUnpressed(this.mouseBindings[binding]!)) return true;
            }
        }
        for(const gamepad of this.gamepads.values()) {
            if(binding in this.controllerBindings) {
                if(gamepad.getButtonUp(this.controllerBindings[binding]!)) return true;
            }
        }
        return false;
    }
    public getMouseAxis(axis: MouseAxis, lockedOnly: boolean = false): number {
        if(this.mouse == null) return 0;
        if(lockedOnly && !this.mouse.isCurrentlyLocked()) return 0;

        switch(axis) {
            case MouseAxis.DELTA_X:
                return this.mouse.getDeltaPosition().x;
            case MouseAxis.DELTA_Y:
                return this.mouse.getDeltaPosition().y;
            case MouseAxis.X:
                return this.mouse.getPosition().x;
            case MouseAxis.Y:
                return this.mouse.getPosition().y;
        }
    }
    public getGamepadAxis(axis: GamepadAxis, deadzone: number, clamp: boolean = true): number {
        let factor = 0;

        for(const gamepad of this.gamepads.values()) {
            switch(axis) {
                case GamepadAxis.LEFT_X:
                    factor += gamepad.getAxis(AXES.STANDARD.THUMBSTICK_LEFT_X);
                    break;
                case GamepadAxis.LEFT_Y:
                    factor -= gamepad.getAxis(AXES.STANDARD.THUMBSTICK_LEFT_Y);
                    break;
                case GamepadAxis.RIGHT_X:
                    factor += gamepad.getAxis(AXES.STANDARD.THUMBSTICK_RIGHT_X);
                    break;
                case GamepadAxis.RIGHT_Y:
                    factor -= gamepad.getAxis(AXES.STANDARD.THUMBSTICK_RIGHT_Y);
                    break;
            }
        }

        if(Math.abs(factor) < deadzone) return 0;

        if(factor > 0) {
            factor = MathUtils.mapLinear(factor, deadzone, 1, 0, 1);
        } else if(factor < 0) {
            factor = MathUtils.mapLinear(factor, -1, -deadzone, -1, 0);
        }

        if(isNaN(factor)) factor = 0;

        if(clamp) {
            if(factor > 1) return 1;
            if(factor < -1) return -1;
        }

        return factor;
    }
    public getAnalog(binding: ControlBinding, clamp: boolean = true): number {
        let factor = 0;
        if(this.keyboard != null) {
            if(binding in this.keyBindings) {
                if(this.keyboard.isPressed(this.keyBindings[binding]!)) factor++;
            }
        }
        if(this.mouse != null) {
            if(binding in this.mouseBindings) {
                if(this.mouse.isPressed(this.mouseBindings[binding]!)) factor++;
            }
        }
        for(const gamepad of this.gamepads.values()) {
            if(binding in this.controllerBindings) {
                factor += gamepad.getButtonValue(this.controllerBindings[binding]!);
            }
        }

        if(clamp) {
            if(factor > 1) return 1;
            if(factor < 0) return 0;
        }

        return factor;
    }

    public update() {
        if(this.keyboard != null) {
            this.keyboard.update();
        }
        if(this.mouse != null) {
            this.mouse.update();
        }
        for(const gamepad of this.gamepads.values()) {
            gamepad.update();
        }
    }
}