import { KeyedRegistry } from "objectregistry";
import { SetBlockStateIdAction } from "./block/setBlockStateIdAction";
import { EventAction } from "./eventAction";
import type { EventSheet } from "./eventSheet";
import { RunTriggerAction } from "./block/runTriggerAction";
import type { EventPredicate } from "./eventPredicate";
import { BlockEventPredicate } from "./predicate/blockEventPredicate";

export const eventActionRegistry = new KeyedRegistry<new (eventSheet: EventSheet, args: any) => EventAction>;

eventActionRegistry.register("base:set_block_state_id", SetBlockStateIdAction);
eventActionRegistry.register("base:run_trigger", RunTriggerAction);

eventActionRegistry.lock();



export const eventPredicateRegistry = new KeyedRegistry<new (args: any) => EventPredicate>;

eventPredicateRegistry.register("block", BlockEventPredicate);

eventPredicateRegistry.lock();