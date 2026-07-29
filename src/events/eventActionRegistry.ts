import { KeyedRegistry } from "objectregistry";
import { CloneBlockAction } from "./block/cloneBlockAction";
import { ExplodeAction } from "./block/explodeAction";
import { RunTriggerAction } from "./block/runTriggerAction";
import { SetBlockStateIdAction } from "./block/setBlockStateIdAction";
import { SetBlockStateParameterAction } from "./block/setBlockStateParameterAction";
import { DropBlockItemAction } from "./entity/dropBlockItemAction";
import { DropItemAction } from "./entity/dropItemAction";
import { EventAction } from "./eventAction";
import type { EventPredicate } from "./eventPredicate";
import type { EventSheet } from "./eventSheet";
import { CloseGuiAction } from "./general/closeGuiAction";
import { OpenGuiAction } from "./general/openGuiAction";
import { PlaySoundAction } from "./general/playSoundAction";
import { PreventDefaultAction } from "./general/preventDefaultAction";
import { SetSelectedSlotAction } from "./general/setSelectedSlotAction";
import { BlockEventPredicate } from "./predicate/blockEventPredicate";
import { EntityEventPredicate } from "./predicate/entityEventPredicate";
import { FaceEventPredicate } from "./predicate/faceEventPredicate";
import { PlatformEventPredicate } from "./predicate/platformEventPredicate";
import { PlayerEventPredicate } from "./predicate/playerEventPredicate";
import { UsagesPredicate } from "./predicate/usagesEventPredicate";

export const eventActionRegistry = new KeyedRegistry<new (eventSheet: EventSheet, args: any) => EventAction>;

eventActionRegistry.register("base:set_block_state_id", SetBlockStateIdAction);
eventActionRegistry.register("base:run_trigger", RunTriggerAction);
eventActionRegistry.register("base:set_block_state_parameter", SetBlockStateParameterAction);
eventActionRegistry.register("base:clone_block", CloneBlockAction);
eventActionRegistry.register("base:explode", ExplodeAction);

eventActionRegistry.register("base:open_gui", OpenGuiAction);
eventActionRegistry.register("base:close_gui", CloseGuiAction);
eventActionRegistry.register("base:set_selected_slot", SetSelectedSlotAction);
eventActionRegistry.register("base:play_sound", PlaySoundAction);
eventActionRegistry.register("base:prevent_default", PreventDefaultAction);

eventActionRegistry.register("base:drop_item", DropItemAction);
eventActionRegistry.register("base:drop_block_item", DropBlockItemAction);

eventActionRegistry.lock();



export const eventPredicateRegistry = new KeyedRegistry<new (args: any) => EventPredicate>;

eventPredicateRegistry.register("block", BlockEventPredicate);
eventPredicateRegistry.register("face", FaceEventPredicate);
eventPredicateRegistry.register("entity", EntityEventPredicate);
eventPredicateRegistry.register("platform", PlatformEventPredicate);
eventPredicateRegistry.register("usages", UsagesPredicate);
eventPredicateRegistry.register("player", PlayerEventPredicate);

eventPredicateRegistry.lock();