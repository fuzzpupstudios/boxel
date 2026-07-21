import { Assets as PixiAssets } from "pixi.js";
import { parseEvents, parsePredicate } from "../block/jsonParseUtils";
import type { Assets } from "../data/assets";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { GuiType } from "./guiType";

export class DataDrivenGuiType extends GuiType {
    public static parseJson(json: DataDrivenJson.GuiType, assets: Assets) {
        const guiType = new DataDrivenGuiType(
            json.id,
            json.interactive ?? true,
            json.modal ?? false,
            json.anchor ?? [0.5, 0.5],
            json.offset ?? [0, 0],
        );

        for(const inventory of json.inventories ?? []) {
            guiType.inventories.add(inventory);
        }

        for(const [ groupName, groupSlots ] of Object.entries(json.quickMoveGroups ?? {})) {
            const groupSlotsList = guiType.quickMoveGroups.getOrInsert(groupName, []);

            for(const slotId of groupSlots) {
                groupSlotsList.push(this.parseSlotId(slotId, guiType));
            }
        }

        for(const slot of json.slots ?? []) {
            const slotId = this.parseSlotId(slot.id, guiType);

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
    private static parseSlotId(id: string | number, guiType: GuiType) {
        if(typeof id == "string") return id;

        if(guiType.inventories.size != 1) {
            throw new Error("Cannot use slot number shorthand when the number of defined inventories isn't 1")
        }
        const firstInventory = guiType.inventories.values().next().value!;
        return firstInventory + "." + id;
    }
}