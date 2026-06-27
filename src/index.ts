import { AxesHelper, Color, LoadingManager, Mesh, NearestFilter, PerspectiveCamera, Scene, Texture, TextureLoader } from "three";
import { normalGeometry, texture, uv, vec3, vec4 } from "three/tsl";
import { MeshBasicNodeMaterial, WebGPURenderer } from "three/webgpu";
import { Player } from "./entity/player";
import { ChunkMesher } from "./rendering/chunkMesher";
import type { Time } from "./time";
import { World } from "./world/world";
import { ControlBinding, Input } from "./input/input";
import { blockStateRegistry, tileRegistry } from "./block/blockRegistry";
import { TextureAtlas } from "./assets/textureAtlas";
import { Assets } from "./assets/assets";
import { WorldRenderer } from "./rendering/worldRenderer";


const renderer = new WebGPURenderer({ forceWebGL: true });
const scene = new Scene;
const camera = new PerspectiveCamera(90);

let world: World;
let worldRenderer: WorldRenderer;
let textureAtlas: TextureAtlas;

let player: Player;

const input = new Input;

main();

async function main() {
    await loadTextures();

    document.body.appendChild(renderer.domElement);

    function resize() {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();

        renderer.setPixelRatio(devicePixelRatio);
        renderer.setSize(innerWidth, innerHeight, true);
    }

    resize();
    window.addEventListener("resize", () => resize());

    input.attachKeyboard(document.body);
    input.attachMouse(renderer.domElement);

    window.addEventListener("gamepadconnected", event => {
        console.log(`%cGamepad ${event.gamepad.index} connected`, "color: cornflowerblue; font-family: system-ui; font-size: 2rem; text-stroke: 0.25rem black; font-weight:bold;")
        console.log(event.gamepad.id)
        input.attachController(event.gamepad);
    });
    window.addEventListener("gamepaddisconnected", event => {
        console.log(`%cGamepad ${event.gamepad.index} disconnected`, "color: pink; font-family: system-ui; font-size: 2rem; text-stroke: 0.25rem black; font-weight:bold;")
        console.log(event.gamepad.id)
        input.detachController(event.gamepad);
    });

    await renderer.init();
    renderer.setClearColor(new Color(0x88ccff));

    world = new World;
    worldRenderer = new WorldRenderer(world, textureAtlas);
    player = new Player(world);

    for(let i = 0; i < 64000; i++) {
        world.setBlockStateKey(
            Math.floor(Math.random() * 128 - 64),
            Math.floor(Math.random() * 128 - 64),
            Math.floor(Math.random() * 128 - 64),
            "base:cobblestone[default]"
        )
    }
    for(let x = -4; x < 4; x++) for(let y = -4; y < 4; y++) for(let z = -4; z < 4; z++) {
        for(let dx = 0; dx <= 15; dx += 15) for(let dy = 0; dy <= 15; dy += 15) for(let dz = 0; dz <= 15; dz += 15) {
            world.setBlockStateKey(x * 16 + dx, y * 16 + dy, z * 16 + dz, "base:axes[default]");
        }
    }

    scene.add(worldRenderer.root);
    scene.add(new AxesHelper(16));
    player.aabb.position.set(32, 80, 32);

    requestAnimationFrame(render);
}

async function loadTextures() {
    const loadingManager = new LoadingManager;
    textureAtlas = new TextureAtlas;
    for await(const [ textureId, textureSource ] of Assets.textureRegistry.entries()) {
        let loadedTexture: Texture;
        try {
            loadedTexture = await textureSource.load(loadingManager);
        } catch(e) {
            throw new Error("Failed to load texture " + textureSource, { cause: e });
        }
        textureAtlas.addTexture(textureId, loadedTexture);
    }
    textureAtlas.pack();

    console.log(textureAtlas);
    for(const blockState of blockStateRegistry.values()) {
        blockState.model.setTextureAtlas(textureAtlas);
    }
}

function update(time: Time) {
    for(let i = 0; i < 512; i++) {
        const x = Math.floor(Math.random() * 128 - 64);
        const y = Math.floor(Math.random() * 128 - 64);
        const z = Math.floor(Math.random() * 128 - 64);

        if(world.getBlockStateKey(x, y, z) != "base:air[default]") {
            world.setBlockStateKey(
                x, y, z,
                "base:axes[default]"
            )
        }
    }

    player.walk(
        input.getAnalog(ControlBinding.RIGHT) - input.getAnalog(ControlBinding.LEFT),
        input.getAnalog(ControlBinding.BACKWARD) - input.getAnalog(ControlBinding.FORWARD),
        time
    );

    if (input.isPressed(ControlBinding.JUMP)) {
        player.jump();
    }

    player.rotate(
        (input.getAnalog(ControlBinding.ROTATE_CW) - input.getAnalog(ControlBinding.ROTATE_CCW)) * time.deltaTime * 2,
        (input.getAnalog(ControlBinding.ROTATE_UP) - input.getAnalog(ControlBinding.ROTATE_DOWN)) * time.deltaTime * 2,
    );

    player.tick(time);

    camera.position.set(
        player.aabb.position.x,
        player.aabb.position.y + player.eyeHeight,
        player.aabb.position.z
    );
    camera.rotation.set(player.pitch, -player.yaw, 0, "YZX");

    input.update();
    worldRenderer.render(time);
}


let lastRenderTime = 0;
function render(miliseconds: number) {
    renderer.render(scene, camera);

    const dt = Math.min(miliseconds - lastRenderTime, 500);
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