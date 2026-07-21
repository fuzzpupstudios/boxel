import { KeyedRegistry } from "objectregistry";
import type { GuiType } from "./guiType";

export const guiTypeRegistry = new KeyedRegistry<GuiType>;