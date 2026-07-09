import type { World } from "../world/world";
import type { EventAction } from "./eventAction";

export interface EventCursor {
    world: World;
    x: number;
    y: number;
    z: number;
}

export abstract class EventSheet {
    public readonly triggers = new Map<string, EventAction<any>[]>;

    public runTrigger(name: string, cursor: EventCursor) {
        const actions = this.triggers.get(name);
        if(actions == null) return;

        for(const action of actions) {
            action.run(cursor);
        }
    }

    protected addTriggerAction(name: string, ...action: EventAction<any>[]) {
        const triggers = this.triggers.getOrInsert(name, []);
        triggers.push(...action);
    }
}