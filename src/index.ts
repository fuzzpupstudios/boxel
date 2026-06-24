import { Color, PerspectiveCamera, Scene } from "three";
import { WebGPURenderer } from "three/webgpu";

const renderer = new WebGPURenderer();
const scene = new Scene;
const camera = new PerspectiveCamera(90);

main();

async function main() {
    document.body.appendChild(renderer.domElement);

    resize();
    window.addEventListener("resize", () => resize());

    await renderer.init();
    renderer.setClearColor(new Color(0x88ccff));
    requestAnimationFrame(render);
}

function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight, true);
}

function render() {
    renderer.render(scene, camera);

    requestAnimationFrame(render);
}