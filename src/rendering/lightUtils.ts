import { uint, vec3, vec4 } from "three/src/Three.TSL.js";

export function lightUnpack(light = uint(0)) {
    const r = light.bitAnd(0x000f).toFloat().div(15.0);
    const g = light.bitAnd(0x00f0).shiftRight(4).toFloat().div(15.0);
    const b = light.bitAnd(0x0f00).shiftRight(8).toFloat().div(15.0);
    const sky = light.bitAnd(0xf000).shiftRight(12).toFloat().div(15.0);

    const lightLinear = vec4(r, g, b, sky);
    return lightLinear.pow3();
}

export function lightMix(skyColor: any, shadow: any, light: any) {
    const skyLight = skyColor.mul(light.a);
    const blockLight = light.rgb;

    return skyLight.mul(shadow).add(blockLight).min(vec3(1.0, 1.0, 1.0));
}