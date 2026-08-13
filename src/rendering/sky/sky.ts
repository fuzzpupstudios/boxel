import { PerspectiveCamera, Scene } from "three";
import { color, float, pass, uniform } from "three/tsl";
import type { Node, PassNode } from "three/webgpu";
import type { Assets } from "../../data/assets";

export abstract class Sky {
    public readonly time = uniform(float(0));

    public readonly skyColor = uniform(color(0, 0, 0));
    public readonly fogColor = uniform(color(0, 0, 0));
    public readonly sunlightColor = uniform(color(0, 0, 0));

    public readonly scene = new Scene;

    public readonly camera = new PerspectiveCamera;
    public readonly renderPass: PassNode;

    public constructor(
        protected readonly assets: Assets
    ) {
        this.renderPass = pass(this.scene, this.camera);
    }
    
    public updateCamera(baseCamera: PerspectiveCamera) {
        this.camera.fov = baseCamera.fov;
        this.camera.aspect = baseCamera.aspect;
        this.camera.quaternion.copy(baseCamera.quaternion);
        this.camera.updateProjectionMatrix();
    }

    public abstract create(seed: number): void;
    public abstract update(): void;
    public abstract createSunShadowNode(normal: Node<"vec3">): Node<"float">;
}