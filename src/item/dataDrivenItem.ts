import { parseEvents, parseTags } from "../block/jsonParseUtils";
import type { DataDrivenJson } from "../block/entity/data/dataDrivenJson";
import type { Assets } from "../textures/assets";
import { Item } from "./item";

export class DataDrivenItem extends Item {
    public static parseJson(json: DataDrivenJson.Item, assets: Assets) {
        const texture = assets.textureRegistry.get(json.texture);

        if(texture == null) throw new ReferenceError("Cannot find texture " + json.texture);

        let eventSheet;
        try {
            eventSheet = parseEvents(json.events, assets);
        } catch(e) {
            throw new Error("Failed to parse events " + json.events, { cause: e });
        }

        const tags = parseTags(json.tags);

        return new DataDrivenItem(
            texture,
            eventSheet,
            tags
        );
    }
}