import type { Assets } from "../data/assets";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { EventAction } from "./eventAction";
import { eventActionRegistry, eventPredicateRegistry } from "./eventActionRegistry";
import { EventBranch } from "./eventBranch";
import { AndPredicate, NotPredicate, OrPredicate, type EventPredicate } from "./eventPredicate";
import { EventSheet } from "./eventSheet";

function isEventAction(obj: any): obj is DataDrivenJson.EventAction {
    return obj.id != null;
}
function isEventActionWithPredicate(obj: any): obj is DataDrivenJson.EventActionWithPredicate {
    return obj.if != null;
}

export class DataDrivenEventSheet extends EventSheet {
    public static parseJson(json: DataDrivenJson.EventSheet, assets: Assets, mergePrevious?: EventSheet) {
        const includes = json.include instanceof Array
            ? json.include
            : (json.include == null ? [] : [ json.include ]);
        
        for(const include of includes) {
            const includeJson = assets.eventSheetRegistry.get(include);
            if(includeJson == null) throw new ReferenceError("Cannot find included sheet " + include);

            mergePrevious = this.parseJson(includeJson, assets, mergePrevious);
        }

        const eventSheet = new DataDrivenEventSheet;

        if(mergePrevious != null) {
            for(const [ triggerId, actions ] of mergePrevious.triggers.entries()) {
                for(const action of actions) {
                    eventSheet.addTriggerAction(triggerId, action);
                }
            }
        }

        if(json.triggers != null) {
            for(const [ triggerId, eventActions ] of Object.entries(json.triggers)) {
                try {
                    eventSheet.addTriggerAction(
                        triggerId,
                        ...(
                            eventActions instanceof Array
                            ? eventActions.map(action => this.parseAction(eventSheet, action))
                            : [ this.parseAction(eventSheet, eventActions) ]
                        )
                    );
                } catch(e) {
                    throw new Error("Failed to parse action in " + triggerId, { cause: e });
                }
            }
        }

        return eventSheet;
    }

    private static parseAction(
        eventSheet: EventSheet,
        action: DataDrivenJson.EventAction | DataDrivenJson.EventActionWithPredicate
    ): EventAction {
        if(isEventAction(action)) {
            const EventActionConstructor = eventActionRegistry.get(action.id);
            
            if(EventActionConstructor == null) {
                throw new ReferenceError("Action " + action.id + " cannot be found");
            }

            try {
                return new EventActionConstructor(eventSheet, action.args ?? {});
            } catch(e) {
                throw new Error("Failed to create action " + action.id, { cause: e });
            }
        }
        if(isEventActionWithPredicate(action)) {
            const branch = new EventBranch(
                DataDrivenEventSheet.parsePredicate(action.if),
                action.then instanceof Array
                 ? action.then.map(action => this.parseAction(eventSheet, action))
                 : [ this.parseAction(eventSheet, action.then) ],
                action.else
                 ? action.else instanceof Array
                    ? action.else.map(action => this.parseAction(eventSheet, action))
                    : [ this.parseAction(eventSheet, action.else) ]
                 : [],
            );

            return branch;
        }

        throw new ReferenceError("Cannot derive event action type");
    }
    private static tryParseSpecialPredicate(
        predicateId: string,
        predicate: DataDrivenJson.EventActionPredicateTree | DataDrivenJson.EventActionPredicateTree[]
    ) {
        if(!(predicate instanceof Array)) predicate = [ predicate ];
        const parsedPredicates = predicate.map(predicate => this.parsePredicate(predicate));

        if(predicateId == "and") {
            return new AndPredicate(parsedPredicates);
        }
        if(predicateId == "or") {
            return new OrPredicate(parsedPredicates);
        }
        if(predicateId == "not") {
            return new NotPredicate(parsedPredicates);
        }

        return null;
    }
    public static parsePredicate(
        trees: DataDrivenJson.EventActionPredicateTree | DataDrivenJson.EventActionPredicateTree[]
    ): EventPredicate {
        const predicateList = new Array<EventPredicate>;

        for(const tree of (trees instanceof Array ? trees : [trees])) {
            for(const [ predicateId, json ] of Object.entries(tree)) {
                const EventPredicateConstructor = eventPredicateRegistry.get(predicateId);

                if(EventPredicateConstructor == null) {
                    const special = this.tryParseSpecialPredicate(predicateId, json);
                    if(special === null) {
                        throw new ReferenceError("Predicate " + predicateId + " cannot be found");
                    } else {
                        predicateList.push(special);
                    }
                } else {
                    predicateList.push(new EventPredicateConstructor(json));
                }
            }
        }

        if(predicateList.length == 1) return predicateList[0]!;

        return new AndPredicate(predicateList);
    }
}