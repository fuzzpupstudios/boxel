import { Controller, ControllerAxis, ControllerButton } from "./controller";
import { Keyboard } from "./keyboard";
import { MobileButton, MobileController } from "./mobileController";
import { Mouse, MouseButton } from "./mouse";
import { TouchController } from "./touch";

export enum ControlBinding {
    RIGHT, LEFT, FORWARD, BACKWARD,
    JUMP, CROUCH, TOGGLE_CROUCH, SPRINT,

    DESTROY, USE, PICK_BLOCK,

    ROTATE_CW, ROTATE_CCW,
    ROTATE_UP, ROTATE_DOWN,
    CHANGE_PERSPECTIVE,

    NEXT_ITEM, PREVIOUS_ITEM,

    OPEN_INVENTORY,
    CLOSE_MODAL,

    PAUSE, BACK,
    FULLSCREEN,

    SPLIT_STACK, DROP_ONE, SWAP_STACK, QUICK_MOVE,
    PRESS_UI,

    SLOT_0, SLOT_1, SLOT_2, SLOT_3, SLOT_4, SLOT_5, SLOT_6, SLOT_7, SLOT_8, SLOT_9
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

export interface CompositeControl {
    keyboardKeys?: { preventActivate: boolean, key: string }[],
    controllerButtons?: { preventActivate: boolean, button: ControllerButton }[],
    mouseButtons?: { preventActivate: boolean, button: MouseButton }[],
    mobileButtons?: { preventActivate: boolean, button: MobileButton }[]
}

export class Input {
    public keyboard: Keyboard | null = null;
    public mouse: Mouse | null = null;
    public touch: TouchController | null = null;
    public mobile: MobileController | null = null;
    public readonly controllers: Map<Gamepad, Controller> = new Map;

    private readonly lastCompositeBindingsHeld = new Set<CompositeControl>;

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

        [ControlBinding.OPEN_INVENTORY]: "KeyE",
        [ControlBinding.CLOSE_MODAL]: "KeyE",

        [ControlBinding.PAUSE]: "Escape",
        [ControlBinding.BACK]: "Escape",

        [ControlBinding.FULLSCREEN]: "F11",

        [ControlBinding.SLOT_0]: "Digit1",
        [ControlBinding.SLOT_1]: "Digit2",
        [ControlBinding.SLOT_2]: "Digit3",
        [ControlBinding.SLOT_3]: "Digit4",
        [ControlBinding.SLOT_4]: "Digit5",
        [ControlBinding.SLOT_5]: "Digit6",
        [ControlBinding.SLOT_6]: "Digit7",
        [ControlBinding.SLOT_7]: "Digit8",
        [ControlBinding.SLOT_8]: "Digit9",
        [ControlBinding.SLOT_9]: "Digit0",
    };
    public readonly controllerBindings: Partial<Record<ControlBinding, ControllerButton>> = {
        [ControlBinding.JUMP]: ControllerButton.A,
        [ControlBinding.CHANGE_PERSPECTIVE]: ControllerButton.DPAD_UP,

        [ControlBinding.DESTROY]: ControllerButton.RIGHT_TRIGGER,
        [ControlBinding.USE]: ControllerButton.LEFT_TRIGGER,

        [ControlBinding.PAUSE]: ControllerButton.START,
        [ControlBinding.BACK]: ControllerButton.B,

        [ControlBinding.NEXT_ITEM]: ControllerButton.RIGHT_BUMPER,
        [ControlBinding.PREVIOUS_ITEM]: ControllerButton.LEFT_BUMPER,

        [ControlBinding.OPEN_INVENTORY]: ControllerButton.X,
        [ControlBinding.CLOSE_MODAL]: ControllerButton.B,

        [ControlBinding.TOGGLE_CROUCH]: ControllerButton.LEFT_STICK,
        [ControlBinding.PICK_BLOCK]: ControllerButton.RIGHT_STICK,

        [ControlBinding.SPLIT_STACK]: ControllerButton.X,
        [ControlBinding.DROP_ONE]: ControllerButton.X,
        [ControlBinding.SWAP_STACK]: ControllerButton.A,
        [ControlBinding.QUICK_MOVE]: ControllerButton.Y,

        [ControlBinding.PRESS_UI]: ControllerButton.A
    };
    public readonly mouseBindings: Partial<Record<ControlBinding, MouseButton>> = {
        [ControlBinding.DESTROY]: MouseButton.LEFT,
        [ControlBinding.USE]: MouseButton.RIGHT,
        [ControlBinding.NEXT_ITEM]: MouseButton.SCROLL_UP,
        [ControlBinding.PREVIOUS_ITEM]: MouseButton.SCROLL_DOWN,
        [ControlBinding.PICK_BLOCK]: MouseButton.MIDDLE,
        [ControlBinding.SWAP_STACK]: MouseButton.LEFT,
        [ControlBinding.SPLIT_STACK]: MouseButton.RIGHT,
        [ControlBinding.DROP_ONE]: MouseButton.RIGHT,

        [ControlBinding.PRESS_UI]: MouseButton.LEFT
    };
    public readonly mobileBindings: Partial<Record<ControlBinding, MobileButton>> = {
        [ControlBinding.RIGHT]: MobileButton.RIGHT,
        [ControlBinding.LEFT]: MobileButton.LEFT,
        [ControlBinding.FORWARD]: MobileButton.FORWARD,
        [ControlBinding.BACKWARD]: MobileButton.BACKWARD,

        [ControlBinding.JUMP]: MobileButton.JUMP,

        [ControlBinding.CROUCH]: MobileButton.CROUCH,
        [ControlBinding.TOGGLE_CROUCH]: MobileButton.TOGGLE_CROUCH,

        [ControlBinding.PAUSE]: MobileButton.PAUSE,
    };
    public readonly compositeBindings: Partial<Record<ControlBinding, CompositeControl>> = {
        [ControlBinding.QUICK_MOVE]: {
            keyboardKeys: [
                { key: "ShiftLeft", preventActivate: true }
            ],
            mouseButtons: [
                { button: MouseButton.LEFT, preventActivate: false }
            ]
        }
    };

    public attachKeyboard(body: HTMLElement) {
        this.keyboard = new Keyboard;
        this.keyboard.addListeners(body);
    }
    public attachController(gamepad: Gamepad) {
        const controller = new Controller;
        controller.setGamepad(gamepad);
        this.controllers.set(gamepad, controller);
        return controller;
    }
    public detachController(gamepad: Gamepad) {
        this.controllers.delete(gamepad);
    }
    public attachMouse(body: HTMLElement) {
        this.mouse = new Mouse;
        this.mouse.addListeners(body);
    }
    public attachTouch(body: HTMLElement, isTouchingGui: (x: number, y: number) => boolean) {
        this.touch = new TouchController(isTouchingGui);
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
    private wasPressedInternal(binding: ControlBinding) {
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
        for(const controller of this.controllers.values()) {
            if(binding in this.controllerBindings) {
                if(controller.wasPressed(this.controllerBindings[binding]!)) return true;
            }
        }
        return false;
    }
    private wasPressedComposite(binding: ControlBinding) {
        if(binding in this.compositeBindings) {
            const compositeBinding = this.compositeBindings[binding]!;

            if(this.isPressed(binding)) {
                if(this.keyboard != null) {
                    for(const bind of compositeBinding.keyboardKeys ?? []) {
                        if(bind.preventActivate) continue;
                        if(this.keyboard.wasPressed(bind.key)) return true;
                    }
                }
                if(this.mouse != null) {
                    for(const bind of compositeBinding.mouseButtons ?? []) {
                        if(bind.preventActivate) continue;
                        if(this.mouse.wasPressed(bind.button)) return true;
                    }
                }
                if(this.mobile != null) {
                    for(const bind of compositeBinding.mobileButtons ?? []) {
                        if(bind.preventActivate) continue;
                        if(this.mobile.wasPressed(bind.button)) return true;
                    }
                }
                for(const controller of this.controllers.values()) {
                    for(const bind of compositeBinding.controllerButtons ?? []) {
                        if(controller.wasPressed(bind.button)) return true;
                    }
                }
            }
        }

        return false;
    }
    public wasPressed(binding: ControlBinding): boolean {
        if(this.wasPressedInternal(binding)) return true;
        if(this.wasPressedComposite(binding)) return true;

        return false;
    }
    private wasUnpressedInternal(binding: ControlBinding) {
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
        for(const controller of this.controllers.values()) {
            if(binding in this.controllerBindings) {
                if(controller.wasPressed(this.controllerBindings[binding]!)) return true;
            }
        }

        return false;
    }
    private wasUnpressedComposite(binding: ControlBinding) {
        if(binding in this.compositeBindings) {
            const compositeBinding = this.compositeBindings[binding]!;

            if(
                this.lastCompositeBindingsHeld.has(compositeBinding) &&
                this.getAnalogComposite(binding) < 0.5
            ) return true;
        }

        return true;
    }
    public wasUnpressed(binding: ControlBinding): boolean {
        if(this.wasUnpressedInternal(binding)) return true;
        if(this.wasUnpressedComposite(binding)) return true;

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
    public getFirstTouch(isGuiOnly?: boolean) {
        if(this.touch == null) return null;

        for(const touch of this.touch.touches) {
            if(isGuiOnly == null) {
                return touch;
            } else {
                if(touch.uiTouch == isGuiOnly) return touch;
            }
        }

        return null;
    }
    public getTouchAxis(axis: TouchAxis, isGuiOnly?: boolean): number {
        if(this.touch == null) return 0;

        const touch = this.getFirstTouch(isGuiOnly);

        if(touch == null) return 0;

        switch(axis) {
            case TouchAxis.DELTA_X:
                return touch.dx;
            case TouchAxis.DELTA_Y:
                return touch.dy;
            case TouchAxis.X:
                return touch.x;
            case TouchAxis.Y:
                return touch.y;
            case TouchAxis.DURATION:
                return touch.duration;
        }
    }
    public getDpadStrafe() {
        return this.mobile?.strafe ?? 0;
    }
    public getControllerAxis(axis: ControllerAxis, clamp: boolean = true): number {
        let factor = 0;

        for(const controller of this.controllers.values()) {
            factor += controller.getAxis(axis);
        }

        if(clamp) {
            if(factor > 1) return 1;
            if(factor < -1) return -1;
        }

        return factor;
    }
    private getAnalogInternal(binding: ControlBinding) {
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
        for(const controller of this.controllers.values()) {
            if(binding in this.controllerBindings) {
                factor += controller.getButtonValue(this.controllerBindings[binding]!);
            }
        }

        return factor;
    }
    private getAnalogComposite(binding: ControlBinding) {
        let factor = 0;

        if(binding in this.compositeBindings) {
            const compositeBinding = this.compositeBindings[binding]!;

            let pressed = true;

            if(this.keyboard != null) {
                for(const bind of compositeBinding.keyboardKeys ?? []) {
                    if(!this.keyboard.isPressed(bind.key)) pressed = false;
                }
            }
            if(this.mouse != null) {
                for(const bind of compositeBinding.mouseButtons ?? []) {
                    if(!this.mouse.isPressed(bind.button)) pressed = false;
                }
            }
            if(this.mobile != null) {
                for(const bind of compositeBinding.mobileButtons ?? []) {
                    if(!this.mobile.isPressed(bind.button)) pressed = false;
                }
            }

            let controllerFactor = 0;
            const controllerButtons = compositeBinding.controllerButtons ?? [];

            for(const controller of this.controllers.values()) {
                for(const bind of controllerButtons) {
                    controllerFactor += controller.getButtonValue(bind.button) / controllerButtons.length;
                }
            }

            if(pressed) factor += controllerButtons.length ? controllerFactor : 1;
        }

        return factor;
    }
    public getAnalog(binding: ControlBinding, clamp: boolean = true): number {
        let factor = 0;
        
        factor += this.getAnalogInternal(binding);
        factor += this.getAnalogComposite(binding);

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
        for(const controller of this.controllers.values()) {
            controller.update();
        }

        this.lastCompositeBindingsHeld.clear();
        for(const binding of Object.keys(this.compositeBindings)) {
            if(typeof binding != "number") continue;

            const compositeBinding = this.compositeBindings[binding];
            if(compositeBinding == null) continue;

            if(this.getAnalogComposite(binding) > 0.5) {
                this.lastCompositeBindingsHeld.add(compositeBinding);
            }
        }
    }

    public clearAll() {
        this.keyboard?.clearAll();
        this.mouse?.clearAll();
    }
}