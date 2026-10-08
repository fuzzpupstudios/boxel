import { KeyedRegistry } from "objectregistry";
import type { EventParamGetter } from "./eventParamGetter";
import { SlotStackEventParamGetter } from "./getter/slotStackEventParamGetter";

export const eventParamGetterRegistry = new KeyedRegistry<new (params: unknown) => EventParamGetter<any>>;

eventParamGetterRegistry.register("slot_stack", SlotStackEventParamGetter);