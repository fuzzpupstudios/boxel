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

        const stackSize = json.stackSize ?? 1000;
        const tags = new Set(parseTags(json.tags));
        const attributes = parseAttributes(json.attributes);
        const defaultData = json.defaultData ?? {};

        return new DataDrivenItem(
            new TextureAtlasSlot(json.texture),
            stackSize,
            eventSheet,
            tags,
            attributes,
            defaultData
        );
    }
}