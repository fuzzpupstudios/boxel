import { KeyedRegistry } from "objectregistry";
import { Item } from "./item";

export const itemRegistry = new KeyedRegistry<Item>;