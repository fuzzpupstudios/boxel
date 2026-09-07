import { float } from "three/tsl";
import { Color, MathUtils, Node } from "three/webgpu";
import { Sky } from "./sky";

export class VoidSky extends Sky {
    public override create(seed: number) {
        
    }

    public update() {
        const time = this.time.value;
        const fogColor = this.fogColor.value;
        const skyColor = this.skyColor.value;
        const sunlightColor = this.sunlightColor.value;

        const calculatedSkyColor = new Color(0x000000);

        const skyLuminance = (calculatedSkyColor.r + calculatedSkyColor.g + calculatedSkyColor.b) / 3;

        sunlightColor.set(
            MathUtils.lerp(calculatedSkyColor.r, skyLuminance, 0.9) * 2,
            MathUtils.lerp(calculatedSkyColor.g, skyLuminance, 0.9) * 2,
            MathUtils.lerp(calculatedSkyColor.b, skyLuminance, 0.9) * 2
        );
        fogColor.set(
            calculatedSkyColor.r,
            calculatedSkyColor.g,
            calculatedSkyColor.b
        );
        skyColor.set(
            calculatedSkyColor.r,
            calculatedSkyColor.g,
            calculatedSkyColor.b
        );
    }

    public override createSunShadowNode(normal: Node<"vec3">) {
        return float(1);
    }
}