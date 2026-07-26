import { blockStateRegistry } from "../../block/blockRegistry";
import type { BoxelGame } from "../../boxel";
import type { Player } from "../../entity/player";
import { EventCursor } from "../../events/eventSheet";
import { ControllerAxis } from "../../input/controller";
import { ControlBinding, MouseAxis, TouchAxis } from "../../input/input";
import { ItemStack } from "../../item/itemStack";
import type { BlockStateOutline } from "../../rendering/blockStateOutline";
import type { Time } from "../../time";

export class PlayerController {
    private player?: Player;

    private sprintFlickCooldown = 0;
    private walkForwardCheckSucceeded = false;
    private flyCheckCooldown = 0;
    private jumpCheckSucceeded = false;
    private placeBlockCooldown = 0;
    private destroyBlockCooldown = 0;
    private touchStationaryTime = 0;
    private touchPlaceEligible = false;

    constructor(
        private readonly game: BoxelGame
    ) {}

    public setPlayer(player: Player) {
        this.player = player;
    }
    
    public update(time: Time) {
        if(this.player == null) return;

        const game = this.game;

        let moveDeltaX = (
            game.input.getAnalog(ControlBinding.RIGHT)
            + game.input.getControllerAxis(ControllerAxis.LEFT_X)
            + game.input.getDpadStrafe()
            - game.input.getAnalog(ControlBinding.LEFT)
        );
        let moveDeltaZ = (
            game.input.getAnalog(ControlBinding.BACKWARD)
            + game.input.getControllerAxis(ControllerAxis.LEFT_Y)
            - game.input.getAnalog(ControlBinding.FORWARD)
        );
        this.player.walk(moveDeltaX, moveDeltaZ, time);

        const canSprint = (!this.player.crouching && this.player.onGround) || this.player.flying;
        if(moveDeltaZ < -0.9) {
            if(!this.walkForwardCheckSucceeded) {
                this.walkForwardCheckSucceeded = true;

                if(this.sprintFlickCooldown > 0 && canSprint) {
                    if(!this.player.sprinting) {
                        this.player.setSprinting(true);
                    }
                }
                this.sprintFlickCooldown = 0.25;
            }
        } else {
            this.walkForwardCheckSucceeded = false;
            if(this.player.sprinting) {
                this.player.setSprinting(false);
            }
        }
        if(game.input.wasPressed(ControlBinding.SPRINT) && canSprint) {
            if(!this.player.sprinting) {
                this.player.setSprinting(true);
            }
        }

        this.sprintFlickCooldown -= time.deltaTime;

        if(game.input.isPressed(ControlBinding.JUMP)) {
            if(!this.jumpCheckSucceeded) {
                this.jumpCheckSucceeded = true;

                if(this.flyCheckCooldown > 0) {
                    this.player.setFlying(!this.player.flying);
                }
                this.flyCheckCooldown = 0.25;
            }

            this.player.jump();
        } else {
            this.jumpCheckSucceeded = false;
        }
        this.flyCheckCooldown -= time.deltaTime;

        if(this.player.flying) {
            if(game.input.isPressed(ControlBinding.FLY_UP)) {
                this.player.velocity.y += 100 * time.deltaTime;
            }
            if(game.input.isPressed(ControlBinding.FLY_DOWN)) {
                this.player.velocity.y -= 100 * time.deltaTime;
            }
        }

        if(game.input.wasPressed(ControlBinding.CROUCH)) {
            this.player.setCrouching(true);
        }
        if(game.input.wasUnpressed(ControlBinding.CROUCH)) {
            this.player.setCrouching(false);
        }
        if(game.input.wasPressed(ControlBinding.TOGGLE_CROUCH)) {
            this.player.setCrouching(!this.player.crouching);
        }

        this.updatePlayerInteractions(time);

        if(game.input.wasPressed(ControlBinding.PICK_BLOCK)) {
            if(this.player.targetedBlock.hit) {
                const voxelPos = this.player.targetedBlock.voxel;
                const blockStateId = this.player.world.getBlockState(voxelPos.x, voxelPos.y, voxelPos.z);
                const blockState = blockStateRegistry.get(blockStateId);
                const pickBlockStateId = blockState?.pickBlockStateId ?? blockStateId;

                const existingSlot = this.player.inventory.findItem(pickBlockStateId);
                const selectedSlot = this.player.selectedSlot;

                if(existingSlot >= 0 && existingSlot <= 9) {
                    this.player.selectedSlot = existingSlot;
                } else {
                    const stack = existingSlot == -1
                        ? ItemStack.of(pickBlockStateId, 1)
                        : this.player.inventory.slots[existingSlot]!.stack;
                    this.player.inventory.slots[selectedSlot]?.stack.swap(stack);
                }
            }
        }
        
        if(game.input.wasPressed(ControlBinding.DROP_ITEM)) {
            this.player.dropItem(this.player.inventory.slots[this.player.selectedSlot]!.stack, 1);
        }

        if(game.input.wasPressed(ControlBinding.SLOT_0)) {
            this.player.selectedSlot = 0;
        }
        if(game.input.wasPressed(ControlBinding.SLOT_1)) {
            this.player.selectedSlot = 1;
        }
        if(game.input.wasPressed(ControlBinding.SLOT_2)) {
            this.player.selectedSlot = 2;
        }
        if(game.input.wasPressed(ControlBinding.SLOT_3)) {
            this.player.selectedSlot = 3;
        }
        if(game.input.wasPressed(ControlBinding.SLOT_4)) {
            this.player.selectedSlot = 4;
        }
        if(game.input.wasPressed(ControlBinding.SLOT_5)) {
            this.player.selectedSlot = 5;
        }
        if(game.input.wasPressed(ControlBinding.SLOT_6)) {
            this.player.selectedSlot = 6;
        }
        if(game.input.wasPressed(ControlBinding.SLOT_7)) {
            this.player.selectedSlot = 7;
        }
        if(game.input.wasPressed(ControlBinding.SLOT_8)) {
            this.player.selectedSlot = 8;
        }
        if(game.input.wasPressed(ControlBinding.SLOT_9)) {
            this.player.selectedSlot = 9;
        }

        let lookDeltaX = (
            (
                game.input.getAnalog(ControlBinding.ROTATE_CW) -
                game.input.getAnalog(ControlBinding.ROTATE_CCW) +
                game.input.getControllerAxis(ControllerAxis.RIGHT_X)
            ) * game.settings.controllerSensitivity * 2 * time.deltaTime +
            (
                game.input.getMouseAxis(MouseAxis.DELTA_X, true) * 0.003 +
                game.input.getTouchAxis(TouchAxis.DELTA_X, false) * 0.01
            ) * game.settings.mouseSensitivity
        );
        if(game.settings.invertX) lookDeltaX *= -1;

        let lookDeltaY = (
            (
                game.input.getAnalog(ControlBinding.ROTATE_UP) -
                game.input.getAnalog(ControlBinding.ROTATE_DOWN) -
                game.input.getControllerAxis(ControllerAxis.RIGHT_Y)
            ) * game.settings.controllerSensitivity * 2 * time.deltaTime -
            (
                game.input.getMouseAxis(MouseAxis.DELTA_Y, true) * 0.003 +
                game.input.getTouchAxis(TouchAxis.DELTA_Y, false) * 0.01
            ) * game.settings.mouseSensitivity
        );
        if(game.settings.invertY) lookDeltaY *= -1;

        this.player.rotate(lookDeltaX, lookDeltaY);

        if(game.input.wasPressed(ControlBinding.NEXT_ITEM)) {
            this.player.selectedSlot++;
            if(this.player.selectedSlot > 9) this.player.selectedSlot = 0;
        }
        if(game.input.wasPressed(ControlBinding.PREVIOUS_ITEM)) {
            this.player.selectedSlot--;
            if(this.player.selectedSlot < 0) this.player.selectedSlot = 9;
        }
    }

    public updateTargetedBlock(targetedBlock: BlockStateOutline) {
        if(this.player == null) return;

        if(
            this.player.targetedBlock.hit &&
            this.player.targetedBlock.distance < this.player.reachDistance
        ) {
            targetedBlock.mesh.visible = true;
            targetedBlock.mesh.position.copy(this.player.targetedBlock.voxel)
            const stateKey = this.player.world.getBlockState(
                this.player.targetedBlock.voxel.x,
                this.player.targetedBlock.voxel.y,
                this.player.targetedBlock.voxel.z
            );
            targetedBlock.setBlockState(blockStateRegistry.get(stateKey)!);
        } else {
            targetedBlock.mesh.visible = false;
        }
    }

    private updatePlayerInteractions(time: Time) {
        if(this.player == null) return;

        const game = this.game;
        
        let destroy = game.input.isPressed(ControlBinding.DESTROY);
        let place = game.input.isPressed(ControlBinding.USE);

        if(game.input.touch != null) {
            const touch = game.input.touch;
            const justEnded = touch.justEndedTouches.at(-1);

            const firstTouch = game.input.getFirstTouch(false);
            
            if(justEnded != null) {
                if(!justEnded.uiTouch && justEnded.duration < 0.25 && this.touchPlaceEligible) {
                    place = true;
                }
            } else if(firstTouch != null) {
                if(this.touchStationaryTime < 0.25) {
                    if(Math.abs(firstTouch.dx) + Math.abs(firstTouch.dy) > 3) {
                        this.touchStationaryTime = -0.75;
                        this.touchPlaceEligible = false;
                    } else {
                        this.touchStationaryTime += time.deltaTime;
                    }
                }
                if(this.touchStationaryTime >= 0.25) {
                    destroy = true;
                }
            }
            
            if(firstTouch == null) {
                this.touchStationaryTime = 0;
                this.touchPlaceEligible = true;
            }
        }

        if(destroy) {
            this.destroyBlockCooldown -= time.deltaTime;

            if(this.destroyBlockCooldown <= 0) {
                this.player.destroyed();
                this.destroyBlockCooldown = 0.2;
            }
        } else {
            this.destroyBlockCooldown = 0;
        }
        if(place) {
            this.placeBlockCooldown -= time.deltaTime;

            if(this.placeBlockCooldown <= 0) {
                const success = this.player.use();
                if(success) {
                    this.player.place();
                }
                this.placeBlockCooldown = 0.2;
            }
        } else {
            this.placeBlockCooldown = 0;
        }
    }

    public createEventCursor() {
        if(this.player == null) throw new ReferenceError("PlayerController is not controlling any Player");

        const cursor = new EventCursor(
            this.player.world,
            Math.floor(this.player.position.x),
            Math.floor(this.player.position.y),
            Math.floor(this.player.position.z)
        );
        cursor.entity = this.player;

        return cursor;
    }
}