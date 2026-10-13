import type { Node } from "three/webgpu";
import { Sky } from "./sky";
import { float } from "three/tsl";

export class VoidSky extends Sky {
    public create(seed: number): void {
        
    }
    public update(): void {
        
    }
    public createSunShadowNode(normal: Node<"vec3">): Node<"float"> {
        return float(1);
    }
}