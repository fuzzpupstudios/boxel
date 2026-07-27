import { KeyedRegistry } from "objectregistry";
import { EventSheet } from "./eventSheet";

export const eventSheetRegistry = new KeyedRegistry<EventSheet>;