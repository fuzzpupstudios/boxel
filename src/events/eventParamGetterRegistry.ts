import { KeyedRegistry } from "objectregistry";
import type { EventParamGetter } from "./eventParamGetter";
import { AdditionEventParamGetter, DivisionEventParamGetter, ExponentEventParamGetter, ModuloEventParamGetter, MultiplicationEventParamGetter, SubtractionEventParamGetter } from "./getter/arithmeticParamGetter";

export const eventParamGetterRegistry = new KeyedRegistry<new (params: unknown) => EventParamGetter<any>>;

eventParamGetterRegistry.register("sum", AdditionEventParamGetter);
eventParamGetterRegistry.register("product", MultiplicationEventParamGetter);
eventParamGetterRegistry.register("difference", SubtractionEventParamGetter);
eventParamGetterRegistry.register("quotient", DivisionEventParamGetter);
eventParamGetterRegistry.register("remainder", ModuloEventParamGetter);
eventParamGetterRegistry.register("power", ExponentEventParamGetter);