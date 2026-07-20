import { attribute, mix, vec3 } from "three/src/Three.TSL.js";
import { Node } from "three/webgpu";
import type { LightingEngine } from "../world/lightingEngine";

export function createLightColorNode(lightingEngine: LightingEngine, celestialStrength: Node<"float">, ao: Node<"float">) {
    let lightNode: Node<"vec3"> = vec3(0, 0, 0);

    for(const [ lightIndex, lightingChannel ] of lightingEngine.lightChannels.entries()) {
        let node: Node<"float"> = attribute("light" + lightIndex, "float" as const);

        if(lightingChannel.type.celestial) node = node.mul(celestialStrength);

        lightNode = lightNode.add(lightingChannel.color.mul(node))
    }

    lightNode = lightNode.toVar("lightSum");

    return mix(lightNode.pow3().min(vec3(1.0, 1.0, 1.0)), vec3(0, 0, 0), ao);
}