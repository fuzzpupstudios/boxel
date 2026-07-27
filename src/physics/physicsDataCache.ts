import { blockStateRegistry } from "../block/blockRegistry";
import type { TileCollider } from "../entity/entity";
import type { EventAction } from "../events/eventAction";

export class PhysicsDataCache {
    public readonly tileColliders = new Map<string, TileCollider>;
    public readonly stepTriggers = new Map<string, EventAction[]>;
    public readonly stepSingleTriggers = new Map<string, EventAction[]>;
    public readonly fallTriggers = new Map<string, EventAction[]>;
    public readonly fallSingleTriggers = new Map<string, EventAction[]>;

    public constructor() {
        for(const blockStateId of blockStateRegistry.keys()) {
            const blockState = blockStateRegistry.get(blockStateId)!;
            
            this.tileColliders.set(blockStateId, blockState.collider);

            const stepTriggers = blockState.events.triggers.get("base:step");
            if(stepTriggers != null) {
                this.stepTriggers.set(blockStateId, stepTriggers);
            }

            const stepSoundTriggers = blockState.events.triggers.get("base:step_sound");
            if(stepSoundTriggers != null) {
                this.stepSingleTriggers.set(blockStateId, stepSoundTriggers);
            }

            const fallTriggers = blockState.events.triggers.get("base:fall");
            if(fallTriggers != null) {
                this.fallTriggers.set(blockStateId, fallTriggers);
            }

            const fallSoundTriggers = blockState.events.triggers.get("base:fall_sound");
            if(fallSoundTriggers != null) {
                this.fallSingleTriggers.set(blockStateId, fallSoundTriggers);
            }
        }
    }
}