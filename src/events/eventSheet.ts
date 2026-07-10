import type { World } from "../world/world";
import type { EventAction } from "./eventAction";

export class EventCursor {
    public constructor(
        public readonly world: World,
        public x: number,
        public y: number,
        public z: number
    ) {}

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