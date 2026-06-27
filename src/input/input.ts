import { AXES, BUTTONS, GamepadWrapper } from "gamepad-wrapper";
import { Keyboard } from "./keyboard";
import { Mouse, MouseButton } from "./mouse";

export enum ControlBinding {
    RIGHT, LEFT, FORWARD, BACKWARD,
    JUMP,

    DESTROY, USE,

    ROTATE_CW, ROTATE_CCW,
    ROTATE_UP, ROTATE_DOWN,
    CHANGE_PERSPECTIVE
}

export class Input {
    public keyboard: Keyboard | null = null;
    public mouse: Mouse | null = null;
    public readonly gamepads: Map<Gamepad, GamepadWrapper> = new Map;

    public readonly keyBindings: Partial<Record<ControlBinding, string>> = {
        [ControlBinding.RIGHT]: "d",
        [ControlBinding.LEFT]: "a",
        [ControlBinding.FORWARD]: "w",
        [ControlBinding.BACKWARD]: "s",

        [ControlBinding.DESTROY]: "r",
        [ControlBinding.USE]: "f",

        [ControlBinding.ROTATE_CW]: "arrowright",
        [ControlBinding.ROTATE_CCW]: "arrowleft",
        [ControlBinding.ROTATE_UP]: "arrowup",
        [ControlBinding.ROTATE_DOWN]: "arrowdown",

        [ControlBinding.JUMP]: "space",
        [ControlBinding.CHANGE_PERSPECTIVE]: "g",
    };
    public readonly controllerBindings: Partial<Record<ControlBinding, string>> = {
        [ControlBinding.JUMP]: BUTTONS.STANDARD.RC_BOTTOM,
        [ControlBinding.CHANGE_PERSPECTIVE]: BUTTONS.STANDARD.LC_TOP,

        [ControlBinding.DESTROY]: BUTTONS.STANDARD.TRIGGER_RIGHT,
        [ControlBinding.USE]: BUTTONS.STANDARD.TRIGGER_LEFT,
    };
    public readonly mouseBindings: Partial<Record<ControlBinding, MouseButton>> = {

    };

    public readonly settings = {
        mouseSensitivity: 0.2
    }

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
        for(const gamepad of this.gamepads.values()) {
            if(binding in this.controllerBindings) {
                if(gamepad.getButtonDown(this.controllerBindings[binding]!)) return true;
            }
        }
        return false;
    }
    public getAnalog(binding: ControlBinding, clamp: boolean = true): number {
        let factor = 0;
        if(this.keyboard != null) {
            if(binding in this.keyBindings) {
                if(this.keyboard.isPressed(this.keyBindings[binding]!)) factor++;
            }
        }
        if(this.mouse != null) {
            const { dx, dy } = this.mouse;

            if(this.mouse.isLocked()) {
                if(binding == ControlBinding.ROTATE_CW && dx > 0) factor += dx * this.settings.mouseSensitivity;
                if(binding == ControlBinding.ROTATE_CCW && dx < 0) factor += -dx * this.settings.mouseSensitivity;
                if(binding == ControlBinding.ROTATE_UP && dy < 0) factor += -dy * this.settings.mouseSensitivity;
                if(binding == ControlBinding.ROTATE_DOWN && dy > 0) factor += dy * this.settings.mouseSensitivity;
            }
        }

        for(const gamepad of this.gamepads.values()) {
            let gamepadLX = gamepad.getAxis(AXES.STANDARD.THUMBSTICK_LEFT_X);
            let gamepadLY = gamepad.getAxis(AXES.STANDARD.THUMBSTICK_LEFT_Y);
            let gamepadRX = gamepad.getAxis(AXES.STANDARD.THUMBSTICK_RIGHT_X);
            let gamepadRY = gamepad.getAxis(AXES.STANDARD.THUMBSTICK_RIGHT_Y);

            if(Math.abs(gamepadLX) < 0.1) gamepadLX = 0;
            if(Math.abs(gamepadLY) < 0.1) gamepadLY = 0;
            if(Math.abs(gamepadRX) < 0.1) gamepadRX = 0;
            if(Math.abs(gamepadRY) < 0.1) gamepadRY = 0;

            if(binding == ControlBinding.LEFT && gamepadLX < 0) factor += -gamepadLX;
            if(binding == ControlBinding.RIGHT && gamepadLX > 0) factor += gamepadLX;
            if(binding == ControlBinding.FORWARD && gamepadLY < 0) factor += -gamepadLY;
            if(binding == ControlBinding.BACKWARD && gamepadLY > 0) factor += gamepadLY;

            if(binding == ControlBinding.ROTATE_CW && gamepadRX > 0) factor += gamepadRX;
            if(binding == ControlBinding.ROTATE_CCW && gamepadRX < 0) factor += -gamepadRX;
            if(binding == ControlBinding.ROTATE_UP && gamepadRY < 0) factor += -gamepadRY;
            if(binding == ControlBinding.ROTATE_DOWN && gamepadRY > 0) factor += gamepadRY;

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