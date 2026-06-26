import { AxesHelper, Color, LoadingManager, Mesh, NearestFilter, PerspectiveCamera, Scene, Texture, TextureLoader } from "three";
import { normalGeometry, texture, uv, vec3, vec4 } from "three/tsl";
import { MeshBasicNodeMaterial, WebGPURenderer } from "three/webgpu";
import { Player } from "./entity/player";
import { ChunkMesher } from "./rendering/chunkMesher";
import type { Time } from "./time";
import { World } from "./world/world";
import { ControlBinding, Input } from "./input/input";
import { blockStateRegistry } from "./block/blockRegistry";
import { TextureAtlas } from "./assets/textureAtlas";
import { Assets } from "./assets/assets";


const renderer = new WebGPURenderer({ forceWebGL: true });
const scene = new Scene;
const camera = new PerspectiveCamera(90);

let world: World;
let chunkMesher: ChunkMesher;
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
    chunkMesher = new ChunkMesher(world);
    player = new Player(world);

    for(let i = 0; i < 64000; i++) {
        world.tiles.setTile(
            Math.floor(Math.random() * 64),
            Math.floor(Math.random() * 64),
            Math.floor(Math.random() * 64),
            1 + Math.floor(Math.random() * 3)
        )
    }
    for(let x = 0; x < 4; x++) for(let y = 0; y < 4; y++) for(let z = 0; z < 4; z++) {
        for(let dx = 0; dx <= 15; dx += 15) for(let dy = 0; dy <= 15; dy += 15) for(let dz = 0; dz <= 15; dz += 15) {
            world.tiles.setTile(x * 16 + dx, y * 16 + dy, z * 16 + dz, 4);
        }
    }

    console.log(textureAtlas.packedTexture);

    const material = new MeshBasicNodeMaterial({
        colorNode: vec4(texture(textureAtlas.packedTexture, uv()).rgb.mul(normalGeometry.dot(vec3(0.8, 1.2, 0.5).normalize()).remap(-1, 1, 0, 1)), 1)
    });

    for(let x = 0; x < 4; x++) for(let y = 0; y < 4; y++) for(let z = 0; z < 4; z++) {
        const geometry = chunkMesher.mesh(x, y, z);
        const mesh = new Mesh(geometry, material);
        mesh.position.set(x * 16, y * 16, z * 16);
        scene.add(mesh);
    }

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