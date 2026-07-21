import { MathUtils } from "three";
import type { GuiDPadLeft } from "../gui/prefab/dPadLeft";
import type { GuiDPadRight } from "../gui/prefab/dPadRight";
import type { Topbar } from "../gui/prefab/topbar";

export enum MobileButton {
    LEFT, RIGHT, FORWARD, BACKWARD,
    JUMP, CROUCH, TOGGLE_CROUCH,
    PAUSE
}

export class MobileController {
    private readonly pressingButtons: Set<MobileButton> = new Set;
    private readonly wasPressedButtons: Set<MobileButton> = new Set;
    private readonly wasUnpressedButtons: Set<MobileButton> = new Set;

    public strafe = 0;

    public constructor(
        public readonly dpadLeft: GuiDPadLeft,
        public readonly dpadRight: GuiDPadRight,
        public readonly topbar: Topbar
    ) {
        let movingForward = false;
        dpadLeft.onForwardDown.connect(() => {
            movingForward = true;
            this.pressingButtons.add(MobileButton.FORWARD);
            this.wasPressedButtons.add(MobileButton.FORWARD);
            this.setDiagonalButtonsVisible(true);
        });
        dpadLeft.onForwardUp.connect(() => {
            movingForward = false;
            this.pressingButtons.delete(MobileButton.FORWARD);
            this.wasUnpressedButtons.add(MobileButton.FORWARD);
            this.setDiagonalButtonsVisible(false);
            this.strafe = 0;
        });

        dpadLeft.addEventListener("pointermove", event => {
            if(!movingForward) return;

            const bounds = dpadLeft.getBounds();
            this.strafe = MathUtils.mapLinear(event.clientX, bounds.left, bounds.right, -1, 1);
        });

        dpadLeft.onLeftDown.connect(() => {
            this.pressingButtons.add(MobileButton.LEFT);
            this.wasPressedButtons.add(MobileButton.LEFT);
        });
        dpadLeft.onLeftUp.connect(() => {
            this.pressingButtons.delete(MobileButton.LEFT);
            this.wasUnpressedButtons.add(MobileButton.LEFT);
        });

        dpadLeft.onRightDown.connect(() => {
            this.pressingButtons.add(MobileButton.RIGHT);
            this.wasPressedButtons.add(MobileButton.RIGHT);
        });
        dpadLeft.onRightUp.connect(() => {
            this.pressingButtons.delete(MobileButton.RIGHT);
            this.wasUnpressedButtons.add(MobileButton.RIGHT);
        });

        dpadLeft.onBackwardDown.connect(() => {
            this.pressingButtons.add(MobileButton.BACKWARD);
            this.wasPressedButtons.add(MobileButton.BACKWARD);
        });
        dpadLeft.onBackwardUp.connect(() => {
            this.pressingButtons.delete(MobileButton.BACKWARD);
            this.wasUnpressedButtons.add(MobileButton.BACKWARD);
        });

        dpadLeft.onJumpDown.connect(() => {
            this.pressingButtons.add(MobileButton.JUMP);
            this.wasPressedButtons.add(MobileButton.JUMP);
        });
        dpadLeft.onJumpUp.connect(() => {
            this.pressingButtons.delete(MobileButton.JUMP);
            this.wasUnpressedButtons.add(MobileButton.JUMP);
        });

        dpadRight.onJumpDown.connect(() => {
            this.pressingButtons.add(MobileButton.JUMP);
            this.wasPressedButtons.add(MobileButton.JUMP);
        });
        dpadRight.onJumpUp.connect(() => {
            this.pressingButtons.delete(MobileButton.JUMP);
            this.wasUnpressedButtons.add(MobileButton.JUMP);
        });

        let lastCrouchHit = 0;
        let lastToggleCrouchHit = 0;
        dpadRight.onCrouchDown.connect(() => {
            if(
                lastCrouchHit + 250 > performance.now() &&
                lastToggleCrouchHit + 250 < performance.now()
            ) {
                this.pressingButtons.add(MobileButton.TOGGLE_CROUCH);
                this.wasPressedButtons.add(MobileButton.TOGGLE_CROUCH);
                lastToggleCrouchHit = performance.now();
            } else {
                this.pressingButtons.add(MobileButton.CROUCH);
                this.wasPressedButtons.add(MobileButton.CROUCH);
            }
        });
        dpadRight.onCrouchUp.connect(() => {
            if(this.pressingButtons.delete(MobileButton.CROUCH)) {
                this.wasUnpressedButtons.add(MobileButton.CROUCH);
                lastCrouchHit = performance.now();
            }
            if(this.pressingButtons.delete(MobileButton.TOGGLE_CROUCH)) {
                this.wasUnpressedButtons.add(MobileButton.TOGGLE_CROUCH);
                lastCrouchHit = 0;
            }
        });

        topbar.onPauseDown.connect(() => {
            this.pressingButtons.add(MobileButton.PAUSE);
            this.wasPressedButtons.add(MobileButton.PAUSE);
        });
        topbar.onPauseUp.connect(() => {
            this.pressingButtons.delete(MobileButton.PAUSE);
            this.wasUnpressedButtons.add(MobileButton.PAUSE);
        });

        this.setDiagonalButtonsVisible(false);
    }
    private setDiagonalButtonsVisible(visible: boolean) {
        this.dpadLeft.forwardLeft.visible = visible;
        this.dpadLeft.forwardRight.visible = visible;
    }

    public isPressed(button: MobileButton) {
        return this.pressingButtons.has(button);
    }
    public wasUnpressed(button: MobileButton) {
        return this.wasUnpressedButtons.has(button);
    }
    public wasPressed(button: MobileButton) {
        return this.wasPressedButtons.has(button);
    }

    public update() {
        this.wasPressedButtons.clear();
        this.wasUnpressedButtons.clear();
    }
}