import { KeyedRegistry } from "objectregistry";
import type { EventParamGetter } from "./eventParamGetter";
import { InventorySlotEventParamGetter } from "./getter/inventorySlotEventParamGetter";
import { PropertyEventParamGetter } from "./getter/propertyEventParamGetter";
import { AdditionEventParamGetter, DivisionEventParamGetter, ExponentEventParamGetter, ModuloEventParamGetter, MultiplicationEventParamGetter, SubtractionEventParamGetter } from "./getter/arithmeticParamGetter";
import { BlockEntityDataParamGetter } from "./getter/blockEntityDataParamGetter";

export const eventParamGetterRegistry = new KeyedRegistry<new (params: unknown) => EventParamGetter<any>>;

eventParamGetterRegistry.register("slot", InventorySlotEventParamGetter);
eventParamGetterRegistry.register("prop", PropertyEventParamGetter);
eventParamGetterRegistry.register("block_entity_data", BlockEntityDataParamGetter);


eventParamGetterRegistry.register("sum", AdditionEventParamGetter);
eventParamGetterRegistry.register("product", MultiplicationEventParamGetter);
eventParamGetterRegistry.register("difference", SubtractionEventParamGetter);
eventParamGetterRegistry.register("quotient", DivisionEventParamGetter);
eventParamGetterRegistry.register("remainder", ModuloEventParamGetter);
eventParamGetterRegistry.register("power", ExponentEventParamGetter);