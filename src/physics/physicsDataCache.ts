import { blockStateRegistry } from "../block/blockRegistry";
import type { TileCollider } from "../block/collider";
import type { EventAction } from "../events/eventAction";

export class PhysicsDataCache {
    public readonly tileColliders = new Map<string, TileCollider>;
    public readonly stepTrigger = new Map<string, EventAction>;
    public readonly fallTrigger = new Map<string, EventAction>;

    public constructor() {
        for(const blockStateId of blockStateRegistry.keys()) {
            const blockState = blockStateRegistry.get(blockStateId)!;
            
            this.tileColliders.set(blockStateId, blockState.collider);

            const stepTrigger = blockState.events.triggers.get("base:step");
            if(stepTrigger != null) {
                this.stepTrigger.set(blockStateId, stepTrigger);
            }

            const fallTrigger = blockState.events.triggers.get("base:fall");
            if(fallTrigger != null) {
                this.fallTrigger.set(blockStateId, fallTrigger);
            }
        }
    }
}