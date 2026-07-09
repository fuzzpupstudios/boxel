import { KeyedRegistry } from "objectregistry";
import { SetBlockStateIdAction } from "./block/setBlockStateIdAction";
import { EventAction } from "./eventAction";
import type { EventSheet } from "./eventSheet";

export const eventActionRegistry = new KeyedRegistry<new (eventSheet: EventSheet, args: any) => EventAction<any>>;

eventActionRegistry.register("base:set_block_state_id", SetBlockStateIdAction);

eventActionRegistry.lock();