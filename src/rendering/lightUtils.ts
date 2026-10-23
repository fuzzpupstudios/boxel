import { attribute, float, mix, vec3 } from "three/src/Three.TSL.js";
import { Node } from "three/webgpu";
import type { LightingManager } from "../world/lighting/lightingManager";

export function createLightColorNode(lightingManager: LightingManager, celestialStrength: Node<"float">, ao: Node<"float">) {
    let lightNode: Node<"vec3"> = vec3(0, 0, 0);

    for(const [ lightIndex, lightingChannel ] of lightingManager.lightChannels.entries()) {
        let channelAttribute = attribute("light" + lightIndex, "uint" as const);
        const mappedChannelAttribute = float(channelAttribute).mul(1 / 15).toVertexStage().pow3();

        lightNode = lightNode.add(
            lightingChannel.color.mul(mappedChannelAttribute)
            .mul(lightingChannel.type.celestial ? celestialStrength : 1)
        );
    }

    lightNode = lightNode.toVar();

    return mix(lightNode.min(vec3(1, 1, 1)), vec3(0, 0, 0), ao);
}