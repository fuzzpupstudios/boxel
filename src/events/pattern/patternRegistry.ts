import { KeyedRegistry } from "objectregistry";
import { Pattern } from "./pattern";

export const patternRegistry = new KeyedRegistry<Pattern<any>>;