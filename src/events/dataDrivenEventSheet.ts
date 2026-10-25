import type { Assets } from "../data/assets";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { RunTriggerAction } from "./block/runTriggerAction";
import { ConglomerateAction } from "./conglomerateAction";
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
            let includeJson: DataDrivenJson.EventSheet | undefined;

            if(typeof include == "string") {
                includeJson = assets.eventSheetRegistry.get(include);
            } else {
                includeJson = include;
            }
            if(includeJson == null) throw new ReferenceError("Cannot find included sheet " + include);

            mergePrevious = this.parseJson(includeJson, assets, mergePrevious);
        }

        const eventSheet = new DataDrivenEventSheet;

        if(mergePrevious != null) {
            for(const [ triggerId, action ] of mergePrevious.triggers.entries()) {
                eventSheet.addTriggerAction(triggerId, action);
            }
        }

        if(json.triggers != null) {
            for(const [ triggerId, eventActions ] of Object.entries(json.triggers)) {
                const eventActionsArray = eventActions instanceof Array ? eventActions : [ eventActions ];

                for(let i = 0; i < eventActionsArray.length; i++) {
                    try {
                        eventSheet.addTriggerAction(triggerId, this.parseAction(eventSheet, eventActionsArray[i]));
                    } catch(e) {
                        throw new Error("Failed to parse action " + i + " in " + triggerId, { cause: e });
                    }
                }
            }
        }

        return eventSheet;
    }

    private static parseAction(
        eventSheet: EventSheet,
        action: DataDrivenJson.EventActionOrPredicate
    ): EventAction {
        if(isEventAction(action)) {
            const EventActionConstructor = eventActionRegistry.get(action.id);
            
            if(EventActionConstructor == null) {
                throw new ReferenceError("Action " + action.id + " cannot be found");
            }

            try {
                return new EventActionConstructor(eventSheet, action.args ?? {}, action.capture ?? {});
            } catch(e) {
                throw new Error("Failed to create action " + action.id, { cause: e });
            }
        }
        if(isEventActionWithPredicate(action)) {
            try {
                const branch = new EventBranch(
                    eventSheet,
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
            } catch(e) {
                throw new Error("Failed to create branch", { cause: e });
            }
        }
        if(typeof action == "string") {
            return new RunTriggerAction(eventSheet, action);
        }
        if(typeof action == "object") {
            const actions = new Array<EventAction>;
            for(const [ id, args ] of Object.entries(action)) {
                actions.push(this.parseAction(eventSheet, { id, args }));
            }

            if(actions.length == 1) {
                return actions[0];
            } else {
                return new ConglomerateAction(eventSheet, actions);
            }
        }

        throw new ReferenceError("Cannot derive event action type");
    }
    private static tryParseSpecialPredicate(
        predicateId: string,
        predicate: DataDrivenJson.EventActionPredicateTree | DataDrivenJson.EventActionPredicateTree[]
    ) {
        if(!(predicate instanceof Array)) predicate = [ predicate ];

        if(predicateId == "and") {
            return new AndPredicate(predicate.map(predicate => this.parsePredicate(predicate)));
        }
        if(predicateId == "or") {
            return new OrPredicate(predicate.map(predicate => this.parsePredicate(predicate)));
        }
        if(predicateId == "not") {
            return new NotPredicate(predicate.map(predicate => this.parsePredicate(predicate)));
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
                    try {
                        predicateList.push(new EventPredicateConstructor(json));
                    } catch(e) {
                        throw new Error("Failed to construct predicate " + predicateId, { cause: e })
                    }
                }
            }
        }

        if(predicateList.length == 1) return predicateList[0]!;

        return new AndPredicate(predicateList);
    }
}