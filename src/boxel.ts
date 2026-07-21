import * as PIXI from "pixi.js";
import "pixi.js/events";
import "pixi.js/graphics";
import "pixi.js/mesh";
import "pixi.js/sprite-nine-slice";
import "pixi.js/text-bitmap";
import { mix, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import { blockRegistry, blockStateRegistry, registerAllBlockStates } from "./block/blockRegistry";
import { DataDrivenBlock } from "./block/dataDrivenBlock";
import { blockEntityTypeRegistry } from "./block/entity/blockEntityRegistry";
import { DataDrivenBlockEntityType } from "./block/entity/dataDrivenBlockEntity";
import { FontLoader } from "./font/fontLoader";
import { GuiControllerCrosshair } from "./gui/controllerCrosshair";
import { ControlBinding, Input } from "./input/input";
import { DataDrivenInventoryGuiType } from "./item/dataDrivenInventoryGuiType";
import { DataDrivenItem } from "./item/dataDrivenItem";
import { inventoryGuiTypeRegistry } from "./item/inventoryGuiTypeRegistry";
import { itemRegistry } from "./item/itemRegistry";
import type { MainStorage } from "./persistence/mainStorage";
import { PersistenceManager } from "./persistence/persistenceManager";
import { Settings } from "./settings";
import { GameStage } from "./stage/gameStage";
import { TitleScreenStage } from "./stage/impl/titleScreenStage";
import { Assets } from "./textures/assets";
import { AudioManager } from "./textures/audioManager";
import { TextureAtlas } from "./textures/textureAtlas";
import type { Time } from "./time";
import { lightChannelRegistry } from "./world/lighting/lightChannelRegistry";
import { DataDrivenLightChannel } from "./world/lighting/dataDrivenLightChannel";


export class BoxelGame {
    public static INSTANCE: BoxelGame = null!;

    public readonly threeRenderer: THREE.WebGPURenderer;
    public readonly gui: PIXI.Application;
    public readonly renderPipeline: THREE.RenderPipeline;
    public guiBackground?: PIXI.Sprite;
    public controllerCrosshair: GuiControllerCrosshair | null = null;

    public readonly input: Input;
    public readonly assets = new Assets;
    public readonly persistenceManager = new PersistenceManager;
    public readonly audioManager = new AudioManager(this.assets);

    public textureAtlas: TextureAtlas | null = null;
    public activeStages = new Array<GameStage>;
    public stagePasses = new Array<THREE.Node<"vec4">>;
    public settings: Settings;
    
    public readonly isDesktop: boolean;
    public readonly version: string;

    private lastRenderTime = 0;
    private rootElement: HTMLElement;
    private viewportWidth = 1;
    private viewportHeight = 1;
    public viewportPixelRatio = 1;
    public mainStorage: MainStorage | null = null;
    public guiWidth: number = 0;
    public guiHeight: number = 0;
    public initialized: boolean = false;


    constructor(
        rootElement: HTMLElement,
        options?: {
            isDesktop?: boolean,
            version?: string
        }
    ) {
        this.isDesktop = options?.isDesktop ?? true;
        this.version = options?.version ?? "unknown version";

        BoxelGame.INSTANCE = this;

        this.rootElement = rootElement;
        
        this.threeRenderer = new THREE.WebGPURenderer({
            forceWebGL: true,
            antialias: false
        });
        this.renderPipeline = new THREE.RenderPipeline(this.threeRenderer);
        this.updateRenderPipeline();

        this.gui = new PIXI.Application();
        (<any>globalThis).__PIXI_APP__ = this.gui;
        
        this.input = new Input;
        this.settings = Settings.parse({});

        PIXI.TextureStyle.defaultOptions.scaleMode = "nearest";
    }

    public resize(width: number, height: number, pixelRatio: number) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.viewportPixelRatio = pixelRatio;

        if(!this.initialized) return;

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

            this.updateRenderPipeline();
        } else {
            requestAnimationFrame(() => {
                this.changeStage(stage, savePrevious, true);
            });
        }
    }

    public previousStage(immediate = false) {
        if(immediate) {
            const stage = this.activeStages.pop();
            this.stagePasses.pop();
            this.updateRenderPipeline();
            if(stage != null) {
                this.closeStage(stage);
            }
        } else {
            requestAnimationFrame(() => {
                this.previousStage(true);
            })
        }
    }

    public updateRenderPipeline() {
        let node: THREE.Node<"vec4"> = vec4(0, 0, 0, 1);

        for(const stage of this.activeStages) {
            const pass = stage.getRenderPass();
            if(pass == null) continue;

            node = mix(node, pass, pass.a);
        }

        this.renderPipeline.outputNode = node;
        this.renderPipeline.needsUpdate = true;
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

        this.guiWidth = width / scale;
        this.guiHeight = height / scale;

        if(this.controllerCrosshair != null) {
            this.controllerCrosshair.resize(
                width / scale,
                height / scale
            );
            this.controllerCrosshair.scale.set(scale);
        }
    }

    public attachController(gamepad: Gamepad) {
        console.log(`%cGamepad ${gamepad.index} connected`,
            "color: cornflowerblue; font-family: system-ui; font-size: 2rem; text-stroke: 0.25rem black; font-weight:bold;");
        console.log(gamepad.id);
        const controller = this.input.attachController(gamepad);
        controller.setDeadzone(this.settings.controllerDeadzone);

        if(this.controllerCrosshair != null) {
            this.controllerCrosshair.visible = true;
        }
    }

    public detachController(gamepad: Gamepad) {
        console.log(`%cGamepad ${gamepad.index} disconnected`,
            "color: pink; font-family: system-ui; font-size: 2rem; text-stroke: 0.25rem black; font-weight:bold;");
        console.log(gamepad.id);
        this.input.detachController(gamepad);

        if(this.controllerCrosshair != null && this.input.controllers.size == 0) {
            this.controllerCrosshair.visible = false;
        }
    }

    public updateSettings() {
        this.settings.guiScale = this.settings.guiScale;
        this.updateUiSizes(this.viewportWidth, this.viewportHeight, this.viewportPixelRatio);
        
        for(const controller of this.input.controllers.values()) {
            controller.setDeadzone(this.settings.controllerDeadzone);
        }

        for(const activeStage of this.activeStages) {
            activeStage.updateSettings(this.settings);
        }
    }

    private registerGameData() {
        for(const [ id, json ] of this.assets.lightChannelTypeRegistry.entries()) {
            console.log(id, json);
            try {
                lightChannelRegistry.register(id, DataDrivenLightChannel.parseJson(json));
            } catch(e) {
                throw new Error("Failed to register light channel type " + id, { cause: e });
            }
        }

        for(const [ id, json ] of this.assets.blockEntityTypeRegistry.entries()) {
            try {
                blockEntityTypeRegistry.register(id, new DataDrivenBlockEntityType(json, this.assets));
            } catch(e) {
                throw new Error("Failed to register block entity " + id, { cause: e });
            }
        }
        blockEntityTypeRegistry.lock();

        for(const [ id, json ] of this.assets.blockRegistry.entries()) {
            try {
                blockRegistry.register(id, DataDrivenBlock.parseJson(json, this.assets));
            } catch(e) {
                throw new Error("Failed to register block " + id, { cause: e });
            }
        }
        blockRegistry.lock();

        for(const [ id, json ] of this.assets.itemRegistry.entries()) {
            try {
                itemRegistry.register(id, DataDrivenItem.parseJson(json, this.assets));
            } catch(e) {
                throw new Error("Failed to register item " + id, { cause: e });
            }
        }
        itemRegistry.lock();

        for(const [ id, json ] of this.assets.inventoryGuiTypeRegistry.entries()) {
            try {
                inventoryGuiTypeRegistry.register(id, DataDrivenInventoryGuiType.parseJson(json, this.assets));
            } catch(e) {
                throw new Error("Failed to register gui type " + id, { cause: e });
            }
        }
        inventoryGuiTypeRegistry.lock();
    }

    public onUnfocus() {
        this.input.clearAll();
    }

    public async start() {
        this.mainStorage = this.persistenceManager.openMainStorage();
        this.settings = Settings.parse((await this.mainStorage.get("settings")) ?? {});

        const blob = await fetch("assets/base.zip?" + btoa(this.version)).then(v => v.blob());
        await this.assets.loadPack(blob);

        this.assets.processTemplates();

        this.loadAssets();
        this.registerGameData();
        registerAllBlockStates();

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

        this.guiBackground = new PIXI.Sprite(PIXI.Texture.EMPTY);
        this.guiBackground.interactive = true;
        this.guiBackground.anchor.set(0);
        this.gui.stage.addChild(this.guiBackground);

        this.controllerCrosshair = new GuiControllerCrosshair(this);
        this.controllerCrosshair.zIndex = 100;
        this.gui.stage.addChild(this.controllerCrosshair);
        this.controllerCrosshair.visible = false;

        this.input.attachKeyboard(this.rootElement);
        this.input.attachMouse(this.rootElement);

        this.input.attachTouch(this.rootElement, (x, y) => {
            const bounds = this.gui.canvas.getBoundingClientRect();
            const localX = x - bounds.left;
            const localY = y - bounds.top;

            if(localX < 0 || localY < 0 || localX > bounds.width || localY > bounds.height) {
                return false;
            }

            const target = this.gui.renderer.events.rootBoundary.hitTest(localX, localY);
            
            return target != null && target != this.guiBackground;
        });
    
        for(const blockState of blockStateRegistry.values()) {
            blockState.model.setTextureAtlas(this.textureAtlas!);
        }

        this.queueNextFrame();

        this.changeStage(new TitleScreenStage(this));
        this.initialized = true;
    }

    private loadAssets() {
        for(const [ alias, bitmap ] of this.assets.textureRegistry.entries()) {
            PIXI.Assets.cache.set(alias, PIXI.Texture.from(bitmap));
        }
    
        this.textureAtlas = new TextureAtlas;
        for(const [ textureId, textureSource ] of this.assets.textureRegistry.entries()) {
            if(!textureId.split(":")[1]?.startsWith("block/")) continue;
            
            const loadedTexture = new THREE.Texture(textureSource);
            this.textureAtlas.addTexture(textureId, loadedTexture);
        }
        this.textureAtlas.pack();

        const fontLoader = new FontLoader("BoxelFont");
        for(let characterByteStart = 0; characterByteStart < 0xffff; characterByteStart += 0xff) {
            const hexIdentifier = characterByteStart.toString(16).padStart(4, "0");
            const image = this.assets.textureRegistry.get("base:font/boxel-font-" + hexIdentifier + ".png");

            if(image == null) continue;

            fontLoader.addPage({
                pageTexture: PIXI.Texture.from(image),
                characterByteStart
            });
        }
        console.log("Loading " + fontLoader.pages.length + " font page(s)");
        fontLoader.load();
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
        }
        this.renderPipeline.render();
        this.gui.render();
        this.controllerCrosshair?.update(time);
        this.input.update();

        this.queueNextFrame();
    }
}