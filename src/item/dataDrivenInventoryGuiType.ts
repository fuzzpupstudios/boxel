import { Assets } from "pixi.js";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { InventoryGuiType } from "./inventoryGui";

export class DataDrivenInventoryGuiType extends InventoryGuiType {
    public static parseJson(json: DataDrivenJson.InventoryGuiType) {
        const guiType = new DataDrivenInventoryGuiType(json.interactive ?? true);

        for(const slot of json.slots) {
            guiType.addSlot(
                slot.id,
                slot.pos[0], slot.pos[1],
                slot.insert ?? true,
                slot.extract ?? true,
                slot.size ?? 20,
            );
        }

        guiType.addTexture(Assets.get(json.texture));

        return guiType;
    }
}