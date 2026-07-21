import { Color } from "three";
import type { DataDrivenJson } from "../../data/dataDrivenJson";
import { LightChannelType, LightingEngineType } from "./lightChannelRegistry";

export class DataDrivenLightChannel extends LightChannelType {
    public static parseJson(json: DataDrivenJson.LightChannelType) {
        const defaultColor = new Color(json.defaultColor[0], json.defaultColor[1], json.defaultColor[2]);

        let engineType = LightingEngineType.POINT_SOURCE;

        if(json.type == "point_source") {
            engineType = LightingEngineType.POINT_SOURCE;
        } else if(json.type == "cascading") {
            engineType = LightingEngineType.CASCADING;
        }

        const channel = new LightChannelType(
            json.id,
            defaultColor,
            json.celestial ?? false,
            engineType
        );

        return channel;
    }
}