import { Vector3, Box3 } from "three";
import { Entity } from "./entity";
import type { Time } from "../time";

export class Player extends Entity {
    public override readonly hitbox = new Box3(
        new Vector3(-0.3, 0, -0.3),
        new Vector3(0.3, 1.9, 0.3),
    );
    public readonly eyeHeight = 1.8;
    public yaw = 0;
    public pitch = 0;


    public walk(dx: number, dz: number, time: Time) {
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length > 1) {
            dx /= length;
            dz /= length;
        }

        const friction = this.onGround ? 0.546 : 0.91;
        const moveSpeed = this.onGround
            ? 2 * (0.16277136 / (friction * friction * friction))
            : 0.2;
        const factor = moveSpeed * time.deltaTime * 20;

        this.velocity.x += Math.cos(this.yaw) * dx * factor - Math.sin(this.yaw) * dz * factor;
        this.velocity.z += Math.sin(this.yaw) * dx * factor + Math.cos(this.yaw) * dz * factor;
    }
    public rotate(deltaYaw: number, deltaPitch: number) {
        this.yaw += deltaYaw;
        this.pitch += deltaPitch;
    }

    public jump(): void {
        if (this.onGround) {
            this.velocity.y = 8.4;
            this.onGround = false;
        }
    }

    public tick(time: Time): void {
        super.tick(time);
    }
}