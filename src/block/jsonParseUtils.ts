import { Box3, Vector3 } from "three";
import type { Assets } from "../data/assets";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { DataDrivenEventSheet } from "../events/dataDrivenEventSheet";
import { ConstantPredicate, EventPredicate } from "../events/eventPredicate";
import type { EventSheet } from "../events/eventSheet";
import { TileCollider } from "./collider";
import { BlockModel } from "./model/blockModel";
import { blockTransformRegistry } from "./transform/blockTransformRegistry";

export function parseEvents(events: DataDrivenJson.EventSheetList | undefined, assets: Assets, defaultEvents?: EventSheet) {
    if(events == null || (events instanceof Array && !events.length)) {
        return DataDrivenEventSheet.parseJson({}, assets, defaultEvents);
    }
    
    if(typeof events == "string") {
        events = [ events ];
    }
    if(events instanceof Array) {
        let loadedEvents: EventSheet | undefined = defaultEvents;
        for(const eventSheet of events) {
            let resolvedEvents: DataDrivenJson.EventSheet | undefined;

            if(typeof eventSheet == "string") {
                resolvedEvents = assets.eventSheetRegistry.get(eventSheet);
            } else {
                resolvedEvents = eventSheet;
            }
            if(resolvedEvents == null) throw new ReferenceError("Cannot resolve event sheet parent " + events);

            loadedEvents = DataDrivenEventSheet.parseJson(resolvedEvents, assets, loadedEvents);
        }
        
        return loadedEvents ?? new DataDrivenEventSheet;
    }

    return DataDrivenEventSheet.parseJson(events, assets, defaultEvents);
}
export function parseModel(model: string | DataDrivenJson.BlockStateModel | undefined, assets: Assets, defaultModel?: BlockModel) {
    if(model == null) {
        if(defaultModel == null) {
            return new BlockModel;
        } else {
            return defaultModel.clone();
        }
    }

    if(typeof model == "string") {
        const resolvedModel = assets.blockModelRegistry.get(model);
        if(resolvedModel == null) throw new ReferenceError("Cannot resolve model parent " + model);

        model = resolvedModel;
    }

    const newModel = BlockModel.parseJson(model, assets, defaultModel);
    return newModel;
}
export function parseJsonCollider(json: DataDrivenJson.BlockStateCollider, defaultCollider?: TileCollider): TileCollider {
    const collider = new TileCollider;

    if(defaultCollider != null) {
        for(const hitbox of defaultCollider.hitboxes) {
            collider.hitboxes.push(hitbox.clone());
        }
    }

    if(json.hitboxes != null) {
        for(const hitbox of json.hitboxes) {
            collider.hitboxes.push(new Box3(
                new Vector3(...hitbox.from),
                new Vector3(...hitbox.to)
            ));
        }
    }

    if(json.transforms != null) {
        for(const transform of json.transforms instanceof Array ? json.transforms : [ json.transforms ]) {
            for(const [ transformId, args ] of Object.entries(transform)) {
                const TransformConstructor = blockTransformRegistry.get(transformId);

                try {
                    if(TransformConstructor == null) throw new ReferenceError("Unknown transform");

                    new TransformConstructor(args).transformCollider(collider);
                } catch(e) {
                    throw new Error("Failed to apply collider transform " + transformId, { cause: e });
                }
            }
        }
    }

    collider.snap(1 / 1024);

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
export function parseTags(jsonTags?: string[], previousTags?: Iterable<string>) {
    const tags = new Set(previousTags);

    if(jsonTags != null) {
        for(const tag of jsonTags) {
            if(tag.startsWith("^")) {
                tags.delete(tag.slice(1));
            } else {
                tags.add(tag);
            }
        }
    }

    return Array.from(tags);
}