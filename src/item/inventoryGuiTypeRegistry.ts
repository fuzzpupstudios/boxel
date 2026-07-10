import { KeyedRegistry } from "objectregistry";
import { DataDrivenInventoryGuiType } from "./dataDrivenInventoryGuiType";
import { InventoryGuiType } from "./inventoryGui";

export const inventoryGuiTypeRegistry = new KeyedRegistry<InventoryGuiType>;