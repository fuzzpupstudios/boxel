import { KeyedRegistry } from "objectregistry";
import { InventoryGuiType } from "./inventoryGui";
import { DataDrivenInventoryGuiType } from "./dataDrivenInventoryGuiType";
import type { DataDrivenJson } from "../data/dataDrivenJson";

export const inventoryGuiTypeRegistry = new KeyedRegistry<InventoryGuiType>;


export async function registerInventoryGuiTypes() {
    inventoryGuiTypeRegistry.register("base:player", new DataDrivenInventoryGuiType(
        <DataDrivenJson.InventoryGuiType> <unknown> await import("./impl/player.json")));
    inventoryGuiTypeRegistry.register("base:hotbar", new DataDrivenInventoryGuiType(
        <DataDrivenJson.InventoryGuiType> <unknown> await import("./impl/hotbar.json")));
    

    for await(const inventoryGuiType of inventoryGuiTypeRegistry.values()) {
        if(inventoryGuiType instanceof DataDrivenInventoryGuiType) {
            await inventoryGuiType.loadTexture();
        }
    }
}