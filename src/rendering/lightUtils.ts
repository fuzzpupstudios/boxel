import { vec3 } from "three/src/Three.TSL.js";

export function lightMix(skyColor: any, shadow: any, light: any) {
    const skyLight = skyColor.mul(light.a);
    const blockLight = light.rgb;

    return skyLight.mul(shadow).add(blockLight).min(vec3(1.0, 1.0, 1.0));
}