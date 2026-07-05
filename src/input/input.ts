import { AXES, BUTTONS, GamepadWrapper } from "gamepad-wrapper";
import { Keyboard } from "./keyboard";
import { Mouse, MouseButton } from "./mouse";
import { MathUtils } from "three";
import { MobileButton, MobileController } from "./mobileController";
import { TouchController } from "./touch";

export enum ControlBinding {
    RIGHT, LEFT, FORWARD, BACKWARD,
    JUMP, CROUCH, TOGGLE_CROUCH, SPRINT,

    DESTROY, USE, PICK_BLOCK,

    ROTATE_CW, ROTATE_CCW,
    ROTATE_UP, ROTATE_DOWN,
    CHANGE_PERSPECTIVE,

    NEXT_ITEM, PREVIOUS_ITEM,

    PAUSE, BACK,
    FULLSCREEN
}

export enum GamepadAxis {
    LEFT_X, LEFT_Y,
    RIGHT_X, RIGHT_Y,
}

export enum MouseAxis {
    X, Y,
    DELTA_X, DELTA_Y
}

export enum TouchAxis {
    X, Y,
    DELTA_X, DELTA_Y,
    DURATION
}

export class Input {
    public keyboard: Keyboard | null = null;
    public mouse: Mouse | null = null;
    public touch: TouchController | null = null;
    public mobile: MobileController | null = null;
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
        [ControlBinding.BACK]: "Escape",

        [ControlBinding.FULLSCREEN]: "F11"
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
    public readonly mobileBindings: Partial<Record<ControlBinding, MobileButton>> = {
        [ControlBinding.RIGHT]: MobileButton.RIGHT,
        [ControlBinding.LEFT]: MobileButton.LEFT,
        [ControlBinding.FORWARD]: MobileButton.FORWARD,
        [ControlBinding.BACKWARD]: MobileButton.BACKWARD,

        [ControlBinding.JUMP]: MobileButton.JUMP,

        [ControlBinding.CROUCH]: MobileButton.CROUCH,
        [ControlBinding.TOGGLE_CROUCH]: MobileButton.TOGGLE_CROUCH,

        [ControlBinding.NEXT_ITEM]: MobileButton.NEXT_ITEM,
        [ControlBinding.PREVIOUS_ITEM]: MobileButton.PREVIOUS_ITEM,
        [ControlBinding.PAUSE]: MobileButton.PAUSE,
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
    public attachTouch(body: HTMLElement, touchValidator: (x: number, y: number) => boolean) {
        this.touch = new TouchController(touchValidator);
        this.touch.addListeners(body);
    }
    public attachMobileController(mobile: MobileController) {
        this.mobile = mobile;
    }
    public detachMobileController() {
        this.mobile = null;
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
        if(this.mobile != null) {
            if(binding in this.mobileBindings) {
                if(this.mobile.wasPressed(this.mobileBindings[binding]!)) return true;
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
        if(this.mobile != null) {
            if(binding in this.mobileBindings) {
                if(this.mobile.wasUnpressed(this.mobileBindings[binding]!)) return true;
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
                return this.mouse.dx;
            case MouseAxis.DELTA_Y:
                return this.mouse.dy;
            case MouseAxis.X:
                return this.mouse.x;
            case MouseAxis.Y:
                return this.mouse.y;
        }
    }
    public getTouchAxis(axis: TouchAxis, id?: number): number {
        if(this.touch == null) return -1;

        switch(axis) {
            case TouchAxis.DELTA_X:
                return id == null ? this.touch.dx : this.touch.dxAt(id);
            case TouchAxis.DELTA_Y:
                return id == null ? this.touch.dy : this.touch.dyAt(id);
            case TouchAxis.X:
                return id == null ? this.touch.x : this.touch.xAt(id);
            case TouchAxis.Y:
                return id == null ? this.touch.y : this.touch.yAt(id);
            case TouchAxis.DURATION:
                return id == null ? this.touch.duration : this.touch.durationAt(id);
        }
    }
    public getDpadStrafe() {
        return this.mobile?.strafe ?? 0;
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
        if(this.mobile != null) {
            if(binding in this.mobileBindings) {
                if(this.mobile.isPressed(this.mobileBindings[binding]!)) factor++;
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
        if(this.touch != null) {
            this.touch.update();
        }
        if(this.mobile != null) {
            this.mobile.update();
        }
        for(const gamepad of this.gamepads.values()) {
            gamepad.update();
        }
    }
}