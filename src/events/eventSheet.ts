import { Quaternion, Vector3 } from "three";
import type { AudioManager } from "../data/audioManager";
import type { Entity } from "../entity/entity";
import type { GuiManager } from "../gui/guiManager";
import type { RaycastResult } from "../physics/raycaster";
import type { BlockBreakParticleEngine } from "../rendering/blockBreakParticleEngine";
import type { World } from "../world/world";
import type { EventAction } from "./eventAction";

export interface ClientEventPlatform {
    usingTouchscreen: boolean;
    guiManager: GuiManager;
    audioManager: AudioManager;
    blockBreakParticles?: BlockBreakParticleEngine
}

export class EventCursor {
    private static clientPlatform?: ClientEventPlatform;

    public faceNormalX = 0;
    public faceNormalY = 0;
    public faceNormalZ = 0;
    public faceHitX = 0;
    public faceHitY = 0;
    public yaw = 0;
    public pitch = 0;
    public usages = 0;
    public defaultPrevented = false;
    public readonly clientPlatform?: ClientEventPlatform;
    public entity: Entity | null = null;

    public static setClientPlatform(clientPlatform: ClientEventPlatform) {
        this.clientPlatform = clientPlatform;
    }

    public constructor(
        public readonly world: World,
        public x: number,
        public y: number,
        public z: number
    ) {
        this.clientPlatform = EventCursor.clientPlatform!;
    }

    public setPosition(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public addOffset(x: number, y: number, z: number) {
        this.x += x;
        this.y += y;
        this.z += z;
    }
    public removeOffset(x: number, y: number, z: number) {
        this.x -= x;
        this.y -= y;
        this.z -= z;
    }

    public setRotation(yaw: number, pitch: number) {
        this.yaw = yaw;
        this.pitch = pitch;
    }

    public setFaceDataFromRaycastResult(result: RaycastResult) {
        const normal = new Vector3().copy(result.side.normal);

        this.faceNormalX = normal.x;
        this.faceNormalY = normal.y;
        this.faceNormalZ = normal.z;
        
        const projected3D = result.position.clone().sub(result.voxel).projectOnPlane(normal);
        const quaternion = new Quaternion().setFromUnitVectors(normal, new Vector3(0, 0, 1));

        projected3D.applyQuaternion(quaternion);

        this.faceHitX = projected3D.x;
        this.faceHitY = projected3D.y;
    }

    public preventDefault() {
        this.defaultPrevented = true;
    }
}

export abstract class EventSheet {
    public readonly triggers = new Map<string, EventAction[]>;

    public runTrigger(name: string, cursor: EventCursor) {
        const actions = this.triggers.get(name);
        if(actions == null) return;

        for(const action of actions) {
            action.run(cursor);
        }
    }

    public addTriggerAction(name: string, ...action: EventAction[]) {
        const triggers = this.triggers.getOrInsert(name, []);
        triggers.push(...action);
    }
}