import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { EventAction } from "./eventAction";
import { eventActionRegistry } from "./eventActionRegistry";
import { EventSheet } from "./eventSheet";

export class DataDrivenEventSheet extends EventSheet {
    public constructor(json: DataDrivenJson.EventSheet) {
        super();

        for(const [triggerId, eventActions] of Object.entries(json.triggers)) {
            this.addTriggerAction(
                triggerId,
                ...eventActions.map(action => this.parseAction(action))
            );
        }
    }

    private parseAction(action: DataDrivenJson.EventAction): EventAction<any> {
        const EventActionConstructor = eventActionRegistry.get(action.id);
        
        if(EventActionConstructor == null) {
            throw new ReferenceError("Action " + action.id + " cannot be found");
        }

        return new EventActionConstructor(this, action.args);
    }
}