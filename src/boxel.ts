import { LoadingManager, Texture, WebGPURenderer } from "three/webgpu";
import { TextureAtlas } from "./assets/textureAtlas";
import { Input } from "./input/input";
import type { GameStage } from "./stage/gameStage";
import { Assets } from "./assets/assets";
import { blockStateRegistry, registerBlocks } from "./block/blockRegistry";
import type { Time } from "./time";
import { PlayingGameStage } from "./stage/impl/playingGameStage";

export class BoxelGame {
    public static INSTANCE: BoxelGame = null!;
    public readonly renderer: WebGPURenderer;
    public textureAtlas: TextureAtlas | null = null;
    public readonly input: Input;
    public readonly assets = new Assets;
    public activeStage: GameStage | null = null;

    private lastRenderTime = 0;

    constructor(root: HTMLElement) {
        BoxelGame.INSTANCE = this;

        this.renderer = new WebGPURenderer({ forceWebGL: true, antialias: false });

        this.input = new Input;

        root.appendChild(this.renderer.domElement);

        this.input.attachKeyboard(root);
        this.input.attachMouse(this.renderer.domElement);
    }

    public resize(width: number, height: number, pixelRatio: number) {
        this.activeStage?.resize(width, height, pixelRatio);

        this.renderer.setPixelRatio(devicePixelRatio);
        this.renderer.setSize(innerWidth, innerHeight, true);
    }

    public attachController(gamepad: Gamepad) {
        console.log(`%cGamepad ${gamepad.index} connected`,
            "color: cornflowerblue; font-family: system-ui; font-size: 2rem; text-stroke: 0.25rem black; font-weight:bold;");
        console.log(gamepad.id);
        this.input.attachController(gamepad);
    }

    public detachController(gamepad: Gamepad) {
        console.log(`%cGamepad ${gamepad.index} disconnected`,
            "color: pink; font-family: system-ui; font-size: 2rem; text-stroke: 0.25rem black; font-weight:bold;");
        console.log(gamepad.id);
        this.input.detachController(gamepad);
    }

    public async start() {
        await registerBlocks();

        await this.renderer.init();
        const loadingManager = new LoadingManager;
    
        this.textureAtlas = new TextureAtlas;
        for await(const [ textureId, textureSource ] of this.assets.textureRegistry.entries()) {
            let loadedTexture: Texture;
            try {
                loadedTexture = await textureSource.load(loadingManager);
            } catch(e) {
                throw new Error("Failed to load texture " + textureSource, { cause: e });
            }
            this.textureAtlas.addTexture(textureId, loadedTexture);
        }
        this.textureAtlas.pack();
    
        for(const blockState of blockStateRegistry.values()) {
            blockState.model.setTextureAtlas(this.textureAtlas);
        }

        this.queueNextFrame();

        this.activeStage = new PlayingGameStage(this);
    }

    private queueNextFrame() {
        requestAnimationFrame(time => this.render(time));
    }

    public render(miliseconds: number) {
        const dt = Math.min(miliseconds - this.lastRenderTime, 500);
        this.lastRenderTime = miliseconds;

        const time: Time = {
            seconds: miliseconds / 1000,
            miliseconds: miliseconds,
            deltaMs: dt,
            deltaTime: dt / 1000
        }

        if(this.activeStage) {
            this.activeStage.tick(time);
            this.renderer.render(this.activeStage.scene, this.activeStage.camera);
        }

        this.queueNextFrame();
    }
}