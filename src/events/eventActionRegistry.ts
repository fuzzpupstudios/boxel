import { KeyedRegistry } from "objectregistry";
import { CloneBlockAction } from "./block/cloneBlockAction";
import { CloseGuiAction } from "./general/closeGuiAction";
import { OpenGuiAction } from "./general/openGuiAction";
import { RunTriggerAction } from "./block/runTriggerAction";
import { SetBlockStateIdAction } from "./block/setBlockStateIdAction";
import { SetBlockStateParameterAction } from "./block/setBlockStateParameterAction";
import { EventAction } from "./eventAction";
import type { EventPredicate } from "./eventPredicate";
import type { EventSheet } from "./eventSheet";
import { BlockEventPredicate } from "./predicate/blockEventPredicate";
import { EntityEventPredicate } from "./predicate/entityEventPredicate";
import { FaceEventPredicate } from "./predicate/faceEventPredicate";
import { PlatformEventPredicate } from "./predicate/platformEventPredicate";
import { SetSelectedSlotAction } from "./general/setSelectedSlotAction";
import { PlaySound3dAction } from "./general/playSound3dAction";
import { PlaySound2dAction } from "./general/playSound2dAction";
import { PreventDefaultAction } from "./general/preventDefaultAction";
import { ExplodeAction } from "./block/explodeAction";

export const eventActionRegistry = new KeyedRegistry<new (eventSheet: EventSheet, args: any) => EventAction>;

eventActionRegistry.register("base:set_block_state_id", SetBlockStateIdAction);
eventActionRegistry.register("base:run_trigger", RunTriggerAction);
eventActionRegistry.register("base:set_block_state_parameter", SetBlockStateParameterAction);
eventActionRegistry.register("base:clone_block", CloneBlockAction);
eventActionRegistry.register("base:explode", ExplodeAction);

eventActionRegistry.register("base:open_gui", OpenGuiAction);
eventActionRegistry.register("base:close_gui", CloseGuiAction);
eventActionRegistry.register("base:set_selected_slot", SetSelectedSlotAction);
eventActionRegistry.register("base:play_sound_3d", PlaySound3dAction);
eventActionRegistry.register("base:play_sound_2d", PlaySound2dAction);
eventActionRegistry.register("base:prevent_default", PreventDefaultAction);

eventActionRegistry.lock();



export const eventPredicateRegistry = new KeyedRegistry<new (args: any) => EventPredicate>;

eventPredicateRegistry.register("block", BlockEventPredicate);
eventPredicateRegistry.register("face", FaceEventPredicate);
eventPredicateRegistry.register("entity", EntityEventPredicate);
eventPredicateRegistry.register("platform", PlatformEventPredicate);

eventPredicateRegistry.lock();