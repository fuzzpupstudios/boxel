import { attribute, mix, vec3 } from "three/src/Three.TSL.js";
import { Node } from "three/webgpu";
import type { LightingManager } from "../world/lighting/lightingManager";
import type { Sky } from "./sky";

export function createLightColorNode(lightingManager: LightingManager, celestialStrength: Node<"float">, ao: Node<"float">, channels?: Node<"float">[]) {
    let lightNode: Node<"vec3"> = vec3(0, 0, 0);

    for(const [ lightIndex, lightingChannel ] of lightingManager.lightChannels.entries()) {
        let channelAttribute: Node<"float"> = channels?.[lightIndex] ?? attribute("light" + lightIndex, "float" as const);
        channelAttribute = channelAttribute.pow3().toVar();

        lightNode = lightNode.add(
            lightingChannel.color.mul(channelAttribute)
            .mul(lightingChannel.type.celestial ? celestialStrength : 1)
        );
    }

    lightNode = lightNode.toVar();

    return mix(lightNode.min(vec3(1, 1, 1)), vec3(0, 0, 0), ao);
}

export function createSunShadowNode(normal: Node<"vec3">, sky: Sky) {
    const sunDot = normal.dot(sky.sunPos.normalize());
    const moonDot = normal.dot(sky.moonPos.normalize());

    return mix(moonDot, sunDot, sky.dayFactor).remap(-1, 1, 0.25, 0.75);
}