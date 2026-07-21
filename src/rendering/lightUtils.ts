import { attribute, mix, vec3 } from "three/src/Three.TSL.js";
import { Node } from "three/webgpu";
import type { LightingEngine } from "../world/lightingEngine";

export function createLightColorNode(lightingEngine: LightingEngine, celestialStrength: Node<"float">, ao: Node<"float">) {
    let lightNode: Node<"vec3"> = vec3(0, 0, 0);
    let lightNodeUntonemapped: Node<"vec3"> = vec3(0, 0, 0);

    for(const [ lightIndex, lightingChannel ] of lightingEngine.lightChannels.entries()) {
        const channelAttribute: Node<"float"> = attribute("light" + lightIndex, "float" as const);

        if(lightingChannel.type.celestial) {
            lightNodeUntonemapped = lightNodeUntonemapped
                .add(lightingChannel.color.mul(channelAttribute).mul(celestialStrength));
        } else {
            lightNode = lightNode.add(lightingChannel.color.mul(channelAttribute));
        }
    }

    return mix(lightNode.pow3().add(lightNodeUntonemapped).min(vec3(1, 1, 1)), vec3(0, 0, 0), ao);
}