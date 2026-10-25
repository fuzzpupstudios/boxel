import { KeyedRegistry } from "objectregistry";
import { cloneBlockAction } from "./block/cloneBlockAction";
import { explodeAction } from "./block/explodeAction";
import { particleAction } from "./block/particleAction";
import { runTriggerAction } from "./block/runTriggerAction";
import { setBlockStateIdAction } from "./block/setBlockStateIdAction";
import { setBlockStateParameterAction } from "./block/setBlockStateParameterAction";
import { dropBlockItemAction } from "./entity/dropBlockItemAction";
import { dropItemAction } from "./entity/dropItemAction";
import type { EventAction } from "./eventAction";
import type { EventPredicate } from "./eventPredicate";
import type { EventSheet } from "./eventSheet";
import { closeGuiAction } from "./general/closeGuiAction";
import { openGuiAction } from "./general/openGuiAction";
import { playSoundAction } from "./general/playSoundAction";
import { preventDefaultAction } from "./general/preventDefaultAction";
import { setSelectedSlotAction } from "./general/setSelectedSlotAction";
import { blockEventPredicate } from "./predicate/blockEventPredicate";
import { entityEventPredicate } from "./predicate/entityEventPredicate";
import { faceEventPredicate } from "./predicate/faceEventPredicate";
import { platformEventPredicate } from "./predicate/platformEventPredicate";
import { playerEventPredicate } from "./predicate/playerEventPredicate";
import { usagesPredicate } from "./predicate/usagesEventPredicate";
import { mergeSlotStackAction } from "./item/mergeSlotStackAction";
import { equalEventPredicate, greaterThanEqualEventPredicate, greaterThanEventPredicate, lessThanEqualEventPredicate, lessThanEventPredicate, notEqualEventPredicate } from "./predicate/comparisonEventPredicate";
import { setBlockEntityDataAction } from "./block/setBlockEntityDataAction";
import { debugLogAction } from "./block/debugLogAction";
import { variableExistsPredicate } from "./predicate/variableExistsEventPredicate";
import { booleanSetPredicate } from "./predicate/booleanSetEventPredicate";
import { assignValueAction } from "./general/assignValueAction";
import { itemEventPredicate } from "./predicate/itemEventPredicate";
import { setGuiTextAction } from "./ui/setGuiTextAction";
import { setProgressBarFillAction } from "./ui/setProgressBarFillAction";
import { setItemDataAction } from "./block/setItemDataAction";

export const eventActionRegistry = new KeyedRegistry<(args: any, eventSheet: EventSheet, capture: Record<string, string>) => EventAction>;

eventActionRegistry.register("base:set_block_state_id", setBlockStateIdAction);
eventActionRegistry.register("base:run_trigger", runTriggerAction);
eventActionRegistry.register("base:set_block_state_parameter", setBlockStateParameterAction);
eventActionRegistry.register("base:clone_block", cloneBlockAction);
eventActionRegistry.register("base:explode", explodeAction);

eventActionRegistry.register("base:open_gui", openGuiAction);
eventActionRegistry.register("base:close_gui", closeGuiAction);
eventActionRegistry.register("base:set_selected_slot", setSelectedSlotAction);
eventActionRegistry.register("base:play_sound", playSoundAction);
eventActionRegistry.register("base:prevent_default", preventDefaultAction);
eventActionRegistry.register("base:set_gui_text", setGuiTextAction);
eventActionRegistry.register("base:set_progress_bar_fill", setProgressBarFillAction);

eventActionRegistry.register("base:drop_item", dropItemAction);
eventActionRegistry.register("base:drop_block_item", dropBlockItemAction);
eventActionRegistry.register("base:particle", particleAction);

eventActionRegistry.register("base:merge_slot_stack", mergeSlotStackAction);
eventActionRegistry.register("base:set_block_entity_data", setBlockEntityDataAction);
eventActionRegistry.register("base:set_item_data", setItemDataAction);
eventActionRegistry.register("base:debug_log", debugLogAction);

eventActionRegistry.register("base:assign_value", assignValueAction);

eventActionRegistry.lock();



export const eventPredicateRegistry = new KeyedRegistry<(args: any) => EventPredicate>;

eventPredicateRegistry.register("block", blockEventPredicate);
eventPredicateRegistry.register("item", itemEventPredicate);
eventPredicateRegistry.register("face", faceEventPredicate);
eventPredicateRegistry.register("entity", entityEventPredicate);
eventPredicateRegistry.register("platform", platformEventPredicate);
eventPredicateRegistry.register("usages", usagesPredicate);
eventPredicateRegistry.register("player", playerEventPredicate);
eventPredicateRegistry.register("greater_than", greaterThanEventPredicate);
eventPredicateRegistry.register("greater_than_equal", greaterThanEqualEventPredicate);
eventPredicateRegistry.register("less_than", lessThanEventPredicate);
eventPredicateRegistry.register("less_than_equal", lessThanEqualEventPredicate);
eventPredicateRegistry.register("equal", equalEventPredicate);
eventPredicateRegistry.register("not_equal", notEqualEventPredicate);
eventPredicateRegistry.register("variable_exists", variableExistsPredicate);
eventPredicateRegistry.register("boolean_set", booleanSetPredicate);

eventPredicateRegistry.lock();