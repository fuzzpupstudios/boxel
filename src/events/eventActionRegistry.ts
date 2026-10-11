import { KeyedRegistry } from "objectregistry";
import { CloneBlockAction } from "./block/cloneBlockAction";
import { ExplodeAction } from "./block/explodeAction";
import { ParticleAction } from "./block/particleAction";
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
import { MergeSlotStackAction } from "./item/mergeSlotStackAction";
import { EqualEventPredicate, GreaterThanEqualEventPredicate, GreaterThanEventPredicate, LessThanEqualEventPredicate, LessThanEventPredicate, NotEqualEventPredicate } from "./predicate/comparisonEventPredicate";
import { SetBlockEntityDataAction } from "./block/setBlockEntityDataAction";
import { DebugLogAction } from "./block/debugLogAction";
import { VariableExistsPredicate } from "./predicate/variableExistsEventPredicate";
import { BooleanSetPredicate } from "./predicate/booleanSetEventPredicate";
import { AssignValueAction } from "./general/assignValueAction";
import { ItemEventPredicate } from "./predicate/itemEventPredicate";
import { SetGuiTextAction } from "./ui/setGuiTextAction";
import { SetProgressBarFillAction } from "./ui/setProgressBarFillAction";

export const eventActionRegistry = new KeyedRegistry<new (eventSheet: EventSheet, args: any, capture: Record<string, string>) => EventAction>;

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
eventActionRegistry.register("base:set_gui_text", SetGuiTextAction);
eventActionRegistry.register("base:set_progress_bar_fill", SetProgressBarFillAction);

eventActionRegistry.register("base:drop_item", DropItemAction);
eventActionRegistry.register("base:drop_block_item", DropBlockItemAction);
eventActionRegistry.register("base:particle", ParticleAction);

eventActionRegistry.register("base:merge_slot_stack", MergeSlotStackAction);
eventActionRegistry.register("base:set_block_entity_data", SetBlockEntityDataAction);
eventActionRegistry.register("base:debug_log", DebugLogAction);

eventActionRegistry.register("base:assign_value", AssignValueAction);

eventActionRegistry.lock();



export const eventPredicateRegistry = new KeyedRegistry<new (args: any) => EventPredicate>;

eventPredicateRegistry.register("block", BlockEventPredicate);
eventPredicateRegistry.register("item", ItemEventPredicate);
eventPredicateRegistry.register("face", FaceEventPredicate);
eventPredicateRegistry.register("entity", EntityEventPredicate);
eventPredicateRegistry.register("platform", PlatformEventPredicate);
eventPredicateRegistry.register("usages", UsagesPredicate);
eventPredicateRegistry.register("player", PlayerEventPredicate);
eventPredicateRegistry.register("greater_than", GreaterThanEventPredicate);
eventPredicateRegistry.register("greater_than_equal", GreaterThanEqualEventPredicate);
eventPredicateRegistry.register("less_than", LessThanEventPredicate);
eventPredicateRegistry.register("less_than_equal", LessThanEqualEventPredicate);
eventPredicateRegistry.register("equal", EqualEventPredicate);
eventPredicateRegistry.register("not_equal", NotEqualEventPredicate);
eventPredicateRegistry.register("variable_exists", VariableExistsPredicate);
eventPredicateRegistry.register("boolean_set", BooleanSetPredicate);

eventPredicateRegistry.lock();