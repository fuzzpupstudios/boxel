import { Assets as PixiAssets } from "pixi.js";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { DataDrivenEventSheet } from "../events/dataDrivenEventSheet";
import type { Assets } from "../textures/assets";
import { InventoryGuiType } from "./inventoryGui";
import { ConstantPredicate, EventPredicate } from "../events/eventPredicate";

export class DataDrivenInventoryGuiType extends InventoryGuiType {
    public static parseJson(json: DataDrivenJson.InventoryGuiType, assets: Assets) {
        const guiType = new DataDrivenInventoryGuiType(
            json.id,
            json.interactive ?? true,
            json.modal ?? false,
            json.anchor ?? [0.5, 0.5],
            json.offset ?? [0, 0],
        );

        for(const slot of json.slots ?? []) {
            guiType.addSlot(
                slot.id,
                slot.pos[0], slot.pos[1],
                slot.insert ?? true,
                slot.extract ?? true,
                slot.size ?? 20,
            );
        }

        for(const [ graphicId, graphic ] of Object.entries(json.graphics ?? {})) {
            guiType.addGraphic(
                graphicId,
                graphic.type,
                graphic.pos[0], graphic.pos[1],
                graphic,
                this.parseEvents(graphic.events, assets),
                this.parseRenderIfPredicate(graphic.renderIf)
            );
        }

        guiType.addTexture(PixiAssets.get(json.texture));

        return guiType;
    }

    private static parseRenderIfPredicate(json?: DataDrivenJson.EventActionPredicateTree | boolean): EventPredicate {
        json ??= true;

        if(typeof json == "boolean") {
            return new ConstantPredicate(json);
        } else {
            return DataDrivenEventSheet.parsePredicate(json ?? {});
        }
    }

    private static parseEvents(events: DataDrivenJson.EventSheet | string | undefined, assets: Assets) {
        if(events == null) return DataDrivenEventSheet.parseJson({}, assets);

        
        if(typeof events == "string") {
            const resolvedEvents = assets.eventSheetRegistry.get(events);
            if(resolvedEvents == null) throw new ReferenceError("Cannot resolve event sheet " + events);
            
            events = resolvedEvents;
        }

        return DataDrivenEventSheet.parseJson(events, assets);
    }
}