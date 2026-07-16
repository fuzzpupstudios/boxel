import { Assets as PixiAssets } from "pixi.js";
import { parseEvents, parsePredicate } from "../block/jsonParseUtils";
import type { DataDrivenJson } from "../block/entity/data/dataDrivenJson";
import type { Assets } from "../textures/assets";
import { GuiType } from "./inventoryGui";

export class DataDrivenInventoryGuiType extends GuiType {
    public static parseJson(json: DataDrivenJson.InventoryGuiType, assets: Assets) {
        const guiType = new DataDrivenInventoryGuiType(
            json.id,
            json.interactive ?? true,
            json.modal ?? false,
            json.anchor ?? [0.5, 0.5],
            json.offset ?? [0, 0],
        );

        for(const inventory of json.inventories ?? []) {
            guiType.inventories.add(inventory);
        }

        for(const slot of json.slots ?? []) {
            let slotId = slot.id;
            if(typeof slotId == "number") {
                if(guiType.inventories.size != 1) {
                    throw new Error("Cannot use slot number shorthand when the number of defined inventories isn't 1")
                }
                const firstInventory = guiType.inventories.values().next().value!;
                slotId = firstInventory + "." + slotId;
            }

            guiType.addSlot(
                slotId,
                slot.pos[0], slot.pos[1],
                slot.size ?? 20,
            );
        }

        for(const [ graphicId, graphic ] of Object.entries(json.graphics ?? {})) {
            guiType.addGraphic(
                graphicId,
                graphic.type,
                graphic.pos[0], graphic.pos[1],
                graphic,
                parseEvents(graphic.events, assets),
                parsePredicate(graphic.renderIf)
            );
        }

        guiType.addTexture(PixiAssets.get(json.texture));

        return guiType;
    }
}