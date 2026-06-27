import { AxesHelper, Color, LoadingManager, PerspectiveCamera, Scene, Texture } from "three";
import { WebGPURenderer } from "three/webgpu";
import { Assets } from "./assets/assets";
import { TextureAtlas } from "./assets/textureAtlas";
import { blockStateRegistry } from "./block/blockRegistry";
import { Player } from "./entity/player";
import { ControlBinding, Input } from "./input/input";
import { WorldRenderer } from "./rendering/worldRenderer";
import type { Time } from "./time";
import { World } from "./world/world";
import { BlockStateOutline } from "./rendering/blockStateOutline";


const renderer = new WebGPURenderer({ forceWebGL: true, antialias: false });
const scene = new Scene;
const camera = new PerspectiveCamera(90);

let world: World;
let worldRenderer: WorldRenderer;
let textureAtlas: TextureAtlas;
let targetedBlock: BlockStateOutline;

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
    targetedBlock = new BlockStateOutline;
    
    for(let x = -64; x < 64; x++) {
        for(let y = -64; y < 64; y++) {
            for(let z = -64; z < 64; z++) {
                let block = "base:cobblestone[default]";

                if(y > 28) block = "base:dirt[default]";
                if(y > 31) block = "base:grass[default]";
                if(y > 32) block = "base:air[default]";
                world.setBlockStateKey(x, y, z, block);
            }
        }
    }

    scene.add(worldRenderer.root);
    scene.add(new AxesHelper(16));
    scene.add(targetedBlock.mesh);
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

    if(input.isPressed(ControlBinding.JUMP)) {
        player.jump();
    }

    if(input.wasPressed(ControlBinding.DESTROY)) {
        player.destroy();
    }
    if(input.wasPressed(ControlBinding.USE)) {
        player.place();
    }

    player.rotate(
        (input.getAnalog(ControlBinding.ROTATE_CW) - input.getAnalog(ControlBinding.ROTATE_CCW)) * time.deltaTime * 2,
        (input.getAnalog(ControlBinding.ROTATE_UP) - input.getAnalog(ControlBinding.ROTATE_DOWN)) * time.deltaTime * 2,
    );

    player.tick(time);

    if(player.targetedBlock.hit) {
        targetedBlock.mesh.visible = true;
        targetedBlock.mesh.position.copy(player.targetedBlock.voxel)
        const stateKey = world.getBlockStateKey(
            player.targetedBlock.voxel.x,
            player.targetedBlock.voxel.y,
            player.targetedBlock.voxel.z
        );
        targetedBlock.setBlockState(blockStateRegistry.get(stateKey)!);
    } else {
        targetedBlock.mesh.visible = false;
    }

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