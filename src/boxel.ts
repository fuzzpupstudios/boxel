import * as PIXI from "pixi.js";
import * as THREE from "three/webgpu";
import { Assets } from "./assets/assets";
import { TextureAtlas } from "./assets/textureAtlas";
import { blockStateRegistry, registerBlocks } from "./block/blockRegistry";
import { Input } from "./input/input";
import type { GameStage } from "./stage/gameStage";
import { PlayingGameStage } from "./stage/impl/playingGameStage";
import type { Time } from "./time";
import { TitleScreenStage } from "./stage/impl/titleScreenStage";

export class BoxelGame {
    public static INSTANCE: BoxelGame = null!;

    public readonly threeRenderer: THREE.WebGPURenderer;
    public readonly pixiRenderer: PIXI.WebGLRenderer;

    public readonly input: Input;
    public readonly assets = new Assets;
    private uiCanvas: HTMLCanvasElement;

    public textureAtlas: TextureAtlas | null = null;
    public activeStage: GameStage | null = null;

    private lastRenderTime = 0;

    constructor(root: HTMLElement) {
        BoxelGame.INSTANCE = this;
        
        this.threeRenderer = new THREE.WebGPURenderer({ forceWebGL: true, antialias: false, stencil: true });
        this.pixiRenderer = new PIXI.WebGLRenderer();
        
        this.input = new Input;
        
        this.uiCanvas = document.createElement("canvas");
        root.appendChild(this.threeRenderer.domElement);
        root.appendChild(this.uiCanvas);

        this.input.attachKeyboard(root);
        this.input.attachMouse(this.uiCanvas);
    }

    public resize(width: number, height: number, pixelRatio: number) {
        this.activeStage?.resize(width, height, pixelRatio);

        this.threeRenderer.setPixelRatio(pixelRatio);
        this.threeRenderer.setSize(width, height, true);
        this.pixiRenderer.resize(width, height, pixelRatio);
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

        await this.threeRenderer.init();
        await this.pixiRenderer.init({
            canvas: this.uiCanvas,
            clearBeforeRender: true,
            backgroundAlpha: 0,
            antialias: false,
            autoDensity: true,
        });

        const loadingManager = new THREE.LoadingManager;
    
        this.textureAtlas = new TextureAtlas;
        for await(const [ textureId, textureSource ] of this.assets.textureRegistry.entries()) {
            let loadedTexture: THREE.Texture;
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

        this.activeStage = new TitleScreenStage(this);
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

            this.threeRenderer.render(this.activeStage.scene, this.activeStage.camera);
            this.pixiRenderer.render({ container: this.activeStage.gui, clear: true });
        }

        this.queueNextFrame();
    }
}