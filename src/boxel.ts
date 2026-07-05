import * as PIXI from "pixi.js";
import "pixi.js/mesh";
import "pixi.js/sprite-nine-slice";
import "pixi.js/text";
import "pixi.js/events";
import * as THREE from "three/webgpu";
import { Assets } from "./assets/assets";
import { TextureAtlas } from "./assets/textureAtlas";
import { blockStateRegistry, registerBlocks } from "./block/blockRegistry";
import { ControlBinding, Input } from "./input/input";
import type { MainStorage } from "./persistence/mainStorage";
import { PersistenceManager } from "./persistence/persistenceManager";
import { Settings } from "./settings";
import { GameStage } from "./stage/gameStage";
import { TitleScreenStage } from "./stage/impl/titleScreenStage";
import type { Time } from "./time";


export class BoxelGame {
    public static INSTANCE: BoxelGame = null!;

    public readonly threeRenderer: THREE.WebGPURenderer;
    public readonly gui: PIXI.Application;
    public guiBackground?: PIXI.Sprite;

    public readonly input: Input;
    public readonly assets = new Assets;
    public readonly persistenceManager = new PersistenceManager;

    public textureAtlas: TextureAtlas | null = null;
    public activeStages = new Array<GameStage>;
    public settings: Settings;

    private lastRenderTime = 0;
    private rootElement: HTMLElement;
    private viewportWidth = 1;
    private viewportHeight = 1;
    private viewportPixelRatio = 1;
    public mainStorage: MainStorage | null = null;

    constructor(
        rootElement: HTMLElement,
        private isDesktop: boolean
    ) {
        BoxelGame.INSTANCE = this;

        this.rootElement = rootElement;
        
        this.threeRenderer = new THREE.WebGPURenderer({
            forceWebGL: true,
            antialias: false
        });
        this.gui = new PIXI.Application();
        
        this.input = new Input;
        this.settings = Settings.parse({});

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
        
        this.updateUiSizes(this.viewportWidth, this.viewportHeight, this.viewportPixelRatio);
    }

    private closeStage(stage: GameStage) {
        this.gui.stage.removeChild(stage.gui);
    }

    private openStage(stage: GameStage) {
        this.gui.stage.addChild(stage.gui);
        this.updateUiSizes(this.viewportWidth, this.viewportHeight, this.viewportPixelRatio);
        this.updateSettings();
    }

    public getActiveStage<GameStageClass extends GameStage>(StageClass: typeof GameStage): GameStageClass | null {
        for(let i = this.activeStages.length - 1; i >= 0; i--) {
            if(this.activeStages[i] instanceof StageClass) {
                return this.activeStages[i] as GameStageClass;
            }
        }

        return null;
    }

    public changeStage(stage: GameStage, savePrevious = true, immediate = false) {
        if(immediate) {
            if(!savePrevious) {
                for(const activeStage of this.activeStages) {
                    this.closeStage(activeStage);
                }
                this.activeStages.splice(0);
            }

            this.activeStages.push(stage);
            this.openStage(stage);
        } else {
            requestAnimationFrame(() => {
                this.changeStage(stage, savePrevious, true);
            });
        }
    }

    public previousStage(immediate = false) {
        if(immediate) {
            const stage = this.activeStages.pop();
            if(stage != null) {
                this.closeStage(stage);
            }
        } else {
            requestAnimationFrame(() => {
                this.previousStage(true);
            })
        }
    }

    private updateUiSizes(width: number, height: number, pixelRatio: number) {
        const scale = this.settings.guiScale;

        this.guiBackground!.setSize(
            width / scale,
            height / scale
        );

        for(const stage of this.activeStages) {
            stage.resize(
                width / scale,
                height / scale,
                pixelRatio * scale
            );
            stage.gui.scale.set(scale);
        }
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

    public updateSettings() {
        this.settings.guiScale = this.settings.guiScale;
        this.updateUiSizes(this.viewportWidth, this.viewportHeight, this.viewportPixelRatio);

        for(const activeStage of this.activeStages) {
            activeStage.updateSettings(this.settings);
        }
    }

    public async start() {
        this.mainStorage = this.persistenceManager.openMainStorage();
        this.settings = Settings.parse((await this.mainStorage.get("settings")) ?? {});

        await registerBlocks();

        await this.threeRenderer.init();
        this.threeRenderer.setClearColor(0xffffff);
        await this.gui.init({
            backgroundAlpha: 0,
            antialias: false,
            autoDensity: true,
            skipExtensionImports: false,
            resizeTo: this.rootElement
        });
        
        this.rootElement.appendChild(this.threeRenderer.domElement);
        this.rootElement.appendChild(this.gui.canvas);

        this.guiBackground = new PIXI.Sprite(PIXI.Texture.EMPTY);
        this.guiBackground.interactive = true;
        this.guiBackground.anchor.set(0);
        this.gui.stage.addChild(this.guiBackground);

        this.input.attachKeyboard(this.rootElement);
        this.input.attachMouse(this.rootElement);

        // Callback is necessary because PIXI.js hasn't implemented
        // touch events for elements yet:
        // https://github.com/pixijs/pixijs/issues/10181
        this.input.attachTouch(this.rootElement, (x, y) => {
            const bounds = this.gui.canvas.getBoundingClientRect();
            const localX = x - bounds.left;
            const localY = y - bounds.top;

            if(localX < 0 || localY < 0 || localX > bounds.width || localY > bounds.height) {
                return true;
            }

            const target = this.gui.renderer.events.rootBoundary.hitTest(localX, localY);
            return target == null || target === this.guiBackground;
        });

        await this.loadAssets();
    
        for(const blockState of blockStateRegistry.values()) {
            blockState.model.setTextureAtlas(this.textureAtlas!);
        }

        this.queueNextFrame();

        this.changeStage(new TitleScreenStage(this));
    }

    private async loadAssets() {
        const textures = {
            "ui/button": "assets/textures/ui_button.png",
            "ui/slider_background": "assets/textures/ui_slider_background.png",
            "ui/slider_fill": "assets/textures/ui_slider_fill.png",
            "ui/slider_handle": "assets/textures/ui_slider_handle.png",
            "ui/crosshair": "assets/textures/crosshair.png",
            "ui/d_pad": "assets/textures/d_pad.png",
            "ui/fullscreen_button": "assets/textures/ui_fullscreen_button.png"
        }

        for await(const [ alias, src ] of Object.entries(textures)) {
            PIXI.Assets.add({ alias, src });
            await PIXI.Assets.load(alias);
        }

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

    public toggleFullscreen() {
        if(document.fullscreenElement !== document.body) {
            document.body.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
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

        if(this.input.wasPressed(ControlBinding.FULLSCREEN)) this.toggleFullscreen();

        for(const activeStage of this.activeStages) {
            activeStage.tick(time);

            this.threeRenderer.render(activeStage.scene, activeStage.camera);
        }
        this.gui.render();

        this.queueNextFrame();
        this.input.update();
    }

    public isOnDesktop() {
        return this.isDesktop;
    }
}