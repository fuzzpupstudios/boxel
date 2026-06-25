import { AxesHelper, BoxGeometry, Color, Mesh, MeshNormalMaterial, NearestFilter, PerspectiveCamera, Scene, TextureLoader } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { normalGeometry, texture, uv, vec3, vec4 } from "three/tsl";
import { MeshBasicNodeMaterial, WebGPURenderer } from "three/webgpu";
import { ChunkMesher } from "./rendering/chunkMesher";
import { World } from "./world/world";
import type { Time } from "./time";
import { Entity } from "./entity/entity";
import { Player } from "./entity/player";


const renderer = new WebGPURenderer({ forceWebGL: true });
const scene = new Scene;
const camera = new PerspectiveCamera(90);
const controls = new OrbitControls(camera, undefined as any);

const world = new World;
const mesher = new ChunkMesher(world);
const textureLoader = new TextureLoader();

const player = new Player(world);

main();

async function main() {
    document.body.appendChild(renderer.domElement);

    resize();
    window.addEventListener("resize", () => resize());

    await renderer.init();
    renderer.setClearColor(new Color(0x88ccff));

    // attach controls to the renderer's DOM element after it's available
    controls.connect(renderer.domElement);
    controls.enableDamping = true;
    camera.position.set(32, 82, 37);
    controls.target.set(32, 64, 32);

    for(let i = 0; i < 64000; i++) {
        world.tiles.setTile(
            Math.floor(Math.random() * 64),
            Math.floor(Math.random() * 64),
            Math.floor(Math.random() * 64),
            1 + Math.floor(Math.random() * 2)
        )
    }
    for(let x = 0; x < 4; x++) for(let y = 0; y < 4; y++) for(let z = 0; z < 4; z++) {
        world.tiles.setTile(x * 16, y * 16, z * 16, 3);
    }

    const atlas = await textureLoader.loadAsync("assets/atlas.png");
    atlas.magFilter = NearestFilter;

    for(let x = 0; x < 4; x++) for(let y = 0; y < 4; y++) for(let z = 0; z < 4; z++) {
        const geometry = mesher.mesh(x, y, z);
        const mesh = new Mesh(geometry, new MeshBasicNodeMaterial({
            colorNode: vec4(texture(atlas, uv()).rgb.mul(normalGeometry.dot(vec3(0.8, 1.2, 0.5).normalize()).remap(-1, 1, 0, 1)), 1)
        }));
        mesh.position.set(x * 16, y * 16, z * 16);
        scene.add(mesh);
    }

    scene.add(new AxesHelper(16));
    player.acceleration.y = -1;
    player.position.set(32, 80, 32);

    requestAnimationFrame(render);
}

function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight, true);
}

function update(time: Time) {
    player.acceleration.x = Math.random() * 2 - 1;
    player.acceleration.z = Math.random() * 2 - 1;
    player.tick(time);
}


let lastRenderTime = 0;
function render(miliseconds: number) {
    controls.update();
    renderer.render(scene, camera);

    const dt = Math.min(lastRenderTime - miliseconds, 500);
    lastRenderTime = miliseconds;

    const time: Time = {
        seconds: miliseconds / 1000,
        miliseconds: miliseconds,
        deltaMs: dt,
        deltaTime: dt / 1000
    }

    update(time);

    requestAnimationFrame(render);
}