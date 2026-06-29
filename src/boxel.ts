import * as PIXI from "pixi.js";
import "pixi.js/text";
import "pixi.js/sprite-nine-slice";
import * as THREE from "three/webgpu";
import { Assets } from "./assets/assets";
import { TextureAtlas } from "./assets/textureAtlas";
import { blockStateRegistry, registerBlocks } from "./block/blockRegistry";
import { Input } from "./input/input";
import type { GameStage } from "./stage/gameStage";
import { TitleScreenStage } from "./stage/impl/titleScreenStage";
import type { Time } from "./time";

export class BoxelGame {
    public static INSTANCE: BoxelGame = null!;

    public readonly threeRenderer: THREE.WebGPURenderer;
    public readonly gui: PIXI.Application;

    public readonly input: Input;
    public readonly assets = new Assets;

    public textureAtlas: TextureAtlas | null = null;
    public activeStage: GameStage | null = null;

    private lastRenderTime = 0;
    private rootElement: HTMLElement;
    private viewportWidth = 1;
    private viewportHeight = 1;
    private viewportPixelRatio = 1;
    public guiScale = 2;

    constructor(rootElement: HTMLElement) {
        BoxelGame.INSTANCE = this;

        this.rootElement = rootElement;
        
        this.threeRenderer = new THREE.WebGPURenderer({ forceWebGL: true, antialias: false, stencil: true });
        this.gui = new PIXI.Application();
        
        this.input = new Input;


        PIXI.TextureStyle.defaultOptions.scaleMode = "nearest";
    }

    public resize(width: number, height: number, pixelRatio: number) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.viewportPixelRatio = pixelRatio;

        this.threeRenderer.setPixelRatio(pixelRatio);
        this.threeRenderer.setSize(width, height, true);

        this.gui.renderer.resolution = pixelRatio;
        this.gui.renderer.resize(width, height);
        
        this.setUiSize(this.viewportWidth, this.viewportHeight, this.viewportPixelRatio);
    }

    public changeStage(newStage: GameStage) {
        if(this.activeStage != null) {
            this.gui.stage.removeChild(this.activeStage.gui);
        }
        this.activeStage = newStage;

        this.gui.stage.addChild(this.activeStage.gui);
        this.setUiSize(this.viewportWidth, this.viewportHeight, this.viewportPixelRatio);
    }

    private setUiSize(width: number, height: number, pixelRatio: number) {
        if(this.activeStage == null) return;

        this.activeStage.resize(
            width / this.guiScale,
            height / this.guiScale,
            pixelRatio * this.guiScale
        );
        this.activeStage.gui.scale.set(this.guiScale);
    }

    public setGuiScale(guiScale: number) {
        this.guiScale = guiScale;
        this.setUiSize(this.viewportWidth, this.viewportHeight, this.viewportPixelRatio);
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
        await this.gui.init({
            backgroundAlpha: 0,
            antialias: false,
            autoDensity: true,
            skipExtensionImports: false,
            resizeTo: this.rootElement
        });
        
        this.rootElement.appendChild(this.threeRenderer.domElement);
        this.rootElement.appendChild(this.gui.canvas);

        this.input.attachKeyboard(this.rootElement);
        this.input.attachMouse(this.gui.canvas);

        await this.loadAssets();
    
        for(const blockState of blockStateRegistry.values()) {
            blockState.model.setTextureAtlas(this.textureAtlas!);
        }

        this.queueNextFrame();

        this.changeStage(new TitleScreenStage(this));
    }

    private async loadAssets() {
        PIXI.Assets.add({
            alias: "ui/button",
            src: "assets/ui_button.png"
        });
        await PIXI.Assets.load("ui/button");

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
        }
        this.gui.render();

        this.queueNextFrame();
    }
}