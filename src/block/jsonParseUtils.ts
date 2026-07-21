import { Box3, Vector3 } from "three";
import type { Assets } from "../data/assets";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { TileCollider } from "../entity/entity";
import { DataDrivenEventSheet } from "../events/dataDrivenEventSheet";
import { ConstantPredicate, EventPredicate } from "../events/eventPredicate";
import type { EventSheet } from "../events/eventSheet";
import { BlockModel } from "./model/blockModel";

export function parseEvents(events: DataDrivenJson.EventSheet | string[] | string | undefined, assets: Assets) {
    if(events == null || (events instanceof Array && !events.length)) {
        return DataDrivenEventSheet.parseJson({}, assets);
    }
    
    if(typeof events == "string") {
        events = [ events ];
    }
    if(events instanceof Array) {
        let loadedEvents: EventSheet | undefined;
        for(const eventSheetId of events) {
            const resolvedEvents = assets.eventSheetRegistry.get(eventSheetId);
            if(resolvedEvents == null) throw new ReferenceError("Cannot resolve event sheet parent " + events);

            loadedEvents = DataDrivenEventSheet.parseJson(resolvedEvents, assets, loadedEvents);
        }
        
        return loadedEvents!;
    }

    return DataDrivenEventSheet.parseJson(events, assets);
}
export function parseModel(model: string | DataDrivenJson.BlockStateModel, assets: Assets) {
    if(typeof model == "string") {
        const resolvedModel = assets.blockModelRegistry.get(model);
        if(resolvedModel == null) throw new ReferenceError("Cannot resolve model parent " + model);

        model = resolvedModel;
    }

    return BlockModel.parseJson(model, assets);
}
export function parseJsonCollider(json: DataDrivenJson.BlockStateCollider): TileCollider {
    const collider = new TileCollider;

    for(const hitbox of json.hitboxes) {
        collider.hitboxes.push(new Box3(
            new Vector3(...hitbox.from),
            new Vector3(...hitbox.to)
        ));
    }

    return collider;
}
export function parsePredicate(predicate?: DataDrivenJson.EventActionPredicateTree | boolean): EventPredicate {
    predicate ??= true;

    if(typeof predicate == "boolean") {
        return new ConstantPredicate(predicate);
    } else {
        return DataDrivenEventSheet.parsePredicate(predicate ?? {});
    }
}
export function parseTags(jsonTags?: string[]) {
    const tags = new Set<string>;

    if(jsonTags != null) {
        for(const tag of jsonTags) tags.add(tag);
    }

    return tags;
}