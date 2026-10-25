import { KeyedRegistry } from "objectregistry";
import type { EventParamGetter } from "./eventParamGetter";
import { inventorySlotEventParamGetter } from "./getter/inventorySlotEventParamGetter";
import { propertyEventParamGetter } from "./getter/propertyEventParamGetter";
import { additionEventParamGetter, divisionEventParamGetter, exponentEventParamGetter, moduloEventParamGetter, multiplicationEventParamGetter, subtractionEventParamGetter } from "./getter/arithmeticParamGetter";
import { blockEntityDataParamGetter } from "./getter/blockEntityDataParamGetter";
import { matchPatternEventParamGetter } from "./getter/matchPatternEventParamGetter";
import { itemDataParamGetter } from "./getter/itemDataParamGetter";

export const eventParamGetterRegistry = new KeyedRegistry<(params: unknown) => EventParamGetter<any>>;

eventParamGetterRegistry.register("slot", inventorySlotEventParamGetter);
eventParamGetterRegistry.register("prop", propertyEventParamGetter);
eventParamGetterRegistry.register("block_entity_data", blockEntityDataParamGetter);
eventParamGetterRegistry.register("item_data", itemDataParamGetter);
eventParamGetterRegistry.register("match_pattern", matchPatternEventParamGetter);


eventParamGetterRegistry.register("sum", additionEventParamGetter);
eventParamGetterRegistry.register("product", multiplicationEventParamGetter);
eventParamGetterRegistry.register("difference", subtractionEventParamGetter);
eventParamGetterRegistry.register("quotient", divisionEventParamGetter);
eventParamGetterRegistry.register("remainder", moduloEventParamGetter);
eventParamGetterRegistry.register("power", exponentEventParamGetter);