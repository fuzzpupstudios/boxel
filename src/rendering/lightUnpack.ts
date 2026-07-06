import { uint, vec3 } from "three/src/Three.TSL.js";

export function lightUnpack(light = uint(0)) {
    const r = light.bitAnd(0x000f).toFloat().div(15.0);
    const g = light.bitAnd(0x00f0).shiftRight(4).toFloat().div(15.0);
    const b = light.bitAnd(0x0f00).shiftRight(8).toFloat().div(15.0);
    const sky = light.bitAnd(0xf000).shiftRight(12).toFloat().div(15.0);

    const lightLinear = vec3(
        r.add(sky).min(1),
        g.add(sky).min(1),
        b.add(sky).min(1)
    );
    return lightLinear.pow3();
}