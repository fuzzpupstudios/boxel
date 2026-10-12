import { parseAttributes, parseEvents, parseTags } from "../block/jsonParseUtils";
import type { Assets } from "../data/assets";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { TextureAtlasSlot } from "../data/textureAtlas";
import { Item } from "./item";

export class DataDrivenItem extends Item {
    public static parseJson(json: DataDrivenJson.Item, assets: Assets) {
        let eventSheet;
        try {
            eventSheet = parseEvents(json.events, assets);
        } catch(e) {
            throw new Error("Failed to parse events " + json.events, { cause: e });
        }

        const tags = new Set(parseTags(json.tags));
        const attributes = parseAttributes(json.attributes);

        return new DataDrivenItem(
            new TextureAtlasSlot(json.texture),
            eventSheet,
            tags,
            attributes
        );
    }
}