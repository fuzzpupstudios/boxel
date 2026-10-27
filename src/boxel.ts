import * as PIXI from "pixi.js";
import "pixi.js/events";
import "pixi.js/graphics";
import "pixi.js/mesh";
import "pixi.js/sprite-nine-slice";
import "pixi.js/text-bitmap";
import { mix, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import { blockRegistry, blockStateRegistry, reloadAllBlockStates } from "./block/blockRegistry";
import { DataDrivenBlock } from "./block/dataDrivenBlock";
import { blockEntityTypeRegistry } from "./block/entity/blockEntityRegistry";
import { DataDrivenBlockEntityType } from "./block/entity/dataDrivenBlockEntity";
import { AssetPack } from "./data/assetPack";
import { Assets } from "./data/assets";
import { AudioManager } from "./data/audioManager";
import { ModManager } from "./data/modManager";
import { TextureAtlas } from "./data/textureAtlas";
import { DataDrivenEventSheet } from "./events/dataDrivenEventSheet";
import { eventSheetRegistry } from "./events/eventSheetRegistry";
import { FontLoader } from "./font/fontLoader";
import { DataDrivenGuiType } from "./gui/dataDrivenGuiType";
import { guiTypeRegistry } from "./gui/guiTypeRegistry";
import { GuiControllerCrosshair } from "./gui/prefab/controllerCrosshair";
import { ControlBinding, Input, MouseAxis, TouchAxis } from "./input/input";
import { DataDrivenItem } from "./item/dataDrivenItem";
import { itemRegistry } from "./item/itemRegistry";
import { MainStorage } from "./persistence/mainStorage";
import { PersistenceManager } from "./persistence/persistenceManager";
import { Settings } from "./settings";
import { GameStage } from "./stage/gameStage";
import { TitleScreenStage } from "./stage/title/titleScreenStage";
import { Time } from "./time";
import { DataDrivenLightChannel } from "./world/lighting/dataDrivenLightChannel";
import { lightChannelRegistry } from "./world/lighting/lightChannelRegistry";
import { patternRegistry } from "./events/pattern/patternRegistry";
import { DataDrivenPattern } from "./events/pattern/dataDrivenPattern";
import { Signal } from "typed-signals";


export interface TextureAtlases {
    readonly item: TextureAtlas;
    readonly block: TextureAtlas;
}

export class BoxelGame {
    public static INSTANCE: BoxelGame = null!;

    public readonly onCrash = new Signal<(error: any) => void>;

    public gui: PIXI.Application | null = null;
    public threeRenderer: THREE.WebGPURenderer | null = null;
    public renderPipeline: THREE.RenderPipeline | null = null;
    public guiBackground?: PIXI.Sprite;
    public controllerCrosshair: GuiControllerCrosshair | null = null;

    public readonly input: Input;
    public readonly assets = new Assets;
    public readonly modManager: ModManager;
    public readonly mainStorage = new MainStorage;
    public readonly persistenceManager = new PersistenceManager;
    public readonly audioManager = new AudioManager(this.assets);

    public readonly textureAtlases: TextureAtlases = {
        block: new TextureAtlas,
        item: new TextureAtlas
    };
    public activeStages = new Array<GameStage>;
    public stagePasses = new Array<THREE.Node<"vec4">>;
    public settings: Settings;
    
    public readonly isDesktop: boolean;
    public readonly version: string;

    private renderTime = 0;
    private lastRenderTime = 0;
    private nextFrameAllowed = 0;
    private tickerCallback: PIXI.TickerCallback<any> | null = null;
    private textureUnitCount: number | null = null;
    
    private rootElement: HTMLElement;
    private viewportWidth = 1;
    private viewportHeight = 1;
    public viewportPixelRatio = 1;
    public guiWidth: number = 0;
    public guiHeight: number = 0;
    public initialized: boolean = false;
    public focused = true;


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
        
        this.input = new Input;
        this.settings = Settings.parse({});

        this.modManager = new ModManager(this.mainStorage, this.assets);

        PIXI.TextureStyle.defaultOptions.scaleMode = "nearest";
    }

    public resize(width: number, height: number, pixelRatio: number) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.viewportPixelRatio = pixelRatio;

        if(!this.initialized) return;

        if(this.threeRenderer) {
            this.threeRenderer.setPixelRatio(pixelRatio);
            this.threeRenderer.setSize(width, height, true);
        }

        if(this.gui) {
            this.gui.renderer.resolution = pixelRatio;
            this.gui.renderer.resize(width, height);
        }
        
        this.updateUiSizes(this.viewportWidth, this.viewportHeight, this.viewportPixelRatio);
    }

    private closeStage(stage: GameStage) {
        this.gui?.stage.removeChild(stage.gui);
        stage.unload();
    }

    private openStage(stage: GameStage) {
        this.gui?.stage.addChild(stage.gui);
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
                for(const activeStage of this.activeStages.splice(0).reverse()) {
                    this.closeStage(activeStage);
                }
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

        this.renderPipeline!.outputNode = node;
        this.renderPipeline!.needsUpdate = true;
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

        if(this.input.pointerLock) {
            this.input.pointerLock.unadjustedMovement = this.settings.unadjustedMovement;
        }
        
        for(const controller of this.input.controllers.values()) {
            controller.setDeadzone(this.settings.controllerDeadzone);
        }

        for(const activeStage of this.activeStages) {
            activeStage.updateSettings(this.settings);
        }
    }

    private reloadGameData() {
        patternRegistry.reset();
        for(const [ id, json ] of this.assets.patternRegistry.entries()) {
            try {
                patternRegistry.register(id, DataDrivenPattern.parseJson(json));
            } catch(e) {
                throw new Error("Failed to register pattern " + id, { cause: e });
            }
        }
        patternRegistry.lock();
        
        lightChannelRegistry.reset();
        for(const [ id, json ] of this.assets.lightChannelTypeRegistry.entries()) {
            try {
                lightChannelRegistry.register(id, DataDrivenLightChannel.parseJson(json));
            } catch(e) {
                throw new Error("Failed to register light channel type " + id, { cause: e });
            }
        }
        lightChannelRegistry.lock();

        eventSheetRegistry.reset();
        for(const [ id, json ] of this.assets.eventSheetRegistry.entries()) {
            try {
                eventSheetRegistry.register(id, DataDrivenEventSheet.parseJson(json, this.assets));
            } catch(e) {
                throw new Error("Failed to register block entity " + id, { cause: e });
            }
        }
        eventSheetRegistry.lock();

        blockEntityTypeRegistry.reset();
        for(const [ id, json ] of this.assets.blockEntityTypeRegistry.entries()) {
            try {
                blockEntityTypeRegistry.register(id, DataDrivenBlockEntityType.parseJson(json));
            } catch(e) {
                throw new Error("Failed to register block entity " + id, { cause: e });
            }
        }
        blockEntityTypeRegistry.lock();

        blockRegistry.reset();
        for(const [ id, json ] of this.assets.blockRegistry.entries()) {
            try {
                blockRegistry.register(id, DataDrivenBlock.parseJson(json, this.assets));
            } catch(e) {
                throw new Error("Failed to register block " + id, { cause: e });
            }
        }
        blockRegistry.lock();

        itemRegistry.reset();
        for(const [ id, json ] of this.assets.itemRegistry.entries()) {
            try {
                itemRegistry.register(id, DataDrivenItem.parseJson(json, this.assets));
            } catch(e) {
                throw new Error("Failed to register item " + id, { cause: e });
            }
        }
        itemRegistry.lock();

        guiTypeRegistry.reset();
        for(const [ id, json ] of this.assets.guiTypeRegistry.entries()) {
            try {
                guiTypeRegistry.register(id, DataDrivenGuiType.parseJson(json, this.assets));
            } catch(e) {
                throw new Error("Failed to register gui type " + id, { cause: e });
            }
        }
        guiTypeRegistry.lock();

        reloadAllBlockStates();
    }

    public onUnfocus() {
        this.input.clearAll();
        this.focused = false;
    }

    public onFocus() {
        this.focused = true;
    }

    public async start() {
        try {
            this.settings = Settings.parse((await this.mainStorage.get("settings")) ?? {});

            const basePack = await fetch("assets/base.zip?" + btoa(this.version))
                .then(v => v.blob())
                .then(blob => AssetPack.fromBlob(blob));
            
            await this.modManager.load();
            await this.modManager.addModFile("base.zip", basePack, true);
            await this.modManager.save();

            await this.reloadAssets();


            this.gui = new PIXI.Application();
            await this.gui.init({
                preference: "webgl",
                backgroundAlpha: 0,
                antialias: false,
                autoDensity: true,
                skipExtensionImports: false,
                resizeTo: this.rootElement,
                clearBeforeRender: false // three is rendered before the gui
            });

            // force gui to render in this.render()
            this.gui.ticker.remove(this.gui.render, this.gui);

            (<any>globalThis).__PIXI_APP__ = this.gui;
        
            this.threeRenderer = new THREE.WebGPURenderer({
                forceWebGL: true,
                antialias: false,
                canvas: this.gui.canvas
            });
            await this.threeRenderer.init();

            /* stinky claude box */
            {
                // THREE calls gl.drawBuffers() before binding the target framebuffer. Its cache normally hides this,
                // but resetState() clears the cache every frame, so bind the framebuffer first
                const threeBackend = this.threeRenderer.backend as any;
                const threeState = threeBackend.state;
                const drawBuffers = threeState.drawBuffers.bind(threeState);
                threeState.drawBuffers = (renderContext: unknown, framebuffer: WebGLFramebuffer) => {
                    threeState.bindFramebuffer(threeBackend.gl.FRAMEBUFFER, framebuffer);
                    drawBuffers(renderContext, framebuffer);
                };
            }

            this.renderPipeline = new THREE.RenderPipeline(this.threeRenderer);
            this.updateRenderPipeline();
            
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
                if(!this.gui) return false;

                const bounds = this.gui.canvas.getBoundingClientRect();
                const localX = x - bounds.left;
                const localY = y - bounds.top;

                if(localX < 0 || localY < 0 || localX > bounds.width || localY > bounds.height) {
                    return false;
                }

                const target = this.gui.renderer.events.rootBoundary.hitTest(localX, localY);
                
                return target != null && target != this.guiBackground;
            });

            this.changeStage(new TitleScreenStage(this), false, true);
            this.initialized = true;

            this.gui.ticker.add(this.tickerCallback = ticker => {
                this.renderTime += ticker.deltaMS;
                this.render();
            });
        } catch(error) {
            this.crash(error);
        }
    }

    public async stop() {
        for(const stage of this.activeStages.splice(0).reverse()) {
            this.closeStage(stage);
        }

        this.input.dispose();

        if(this.tickerCallback) {
            this.gui?.ticker.remove(this.tickerCallback);
            this.tickerCallback = null;
        }
    }

    public async reloadAssets() {
        await this.modManager.updateInstalledPacks();
        await this.assets.reload();

        for(const alias of this.assets.textureRegistry.keys()) {
            if(PIXI.Assets.cache.has(alias)) PIXI.Assets.cache.remove(alias);
        }
        for(const [ alias, bitmap ] of this.assets.textureRegistry.entries()) {
            PIXI.Assets.cache.set(alias, PIXI.Texture.from(bitmap));
        }
    
        this.textureAtlases.block.reset();
        for(const [ textureId, textureSource ] of this.assets.textureRegistry.entries()) {
            if(!textureId.split(":")[1]?.startsWith("block/")) continue;
            
            this.textureAtlases.block.addTexture(textureId, textureSource);
        }
        this.textureAtlases.block.setDefaultTexture("base:block/axes.png");
        await this.textureAtlases.block.pack();

    
        this.textureAtlases.item.reset();
        for(const [ textureId, textureSource ] of this.assets.textureRegistry.entries()) {
            if(!textureId.split(":")[1]?.startsWith("item/")) continue;
            
            this.textureAtlases.item.addTexture(textureId, textureSource);
        }
        this.textureAtlases.item.setDefaultTexture("base:item/axes.png");
        await this.textureAtlases.item.pack();

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

        this.reloadGameData();
    
        for(const blockState of blockStateRegistry.values()) {
            blockState.model.setTextureAtlas(this.textureAtlases.block);
            
            if(blockState.renderAsTexture != null) {
                blockState.renderAsTexture.setTextureAtlas(this.textureAtlases.item);
            }
        }
    
        for(const item of itemRegistry.values()) {
            item.texture.setTextureAtlas(this.textureAtlases.item);
        }

        for(const gameStage of this.activeStages) {
            gameStage.reloadAssets();
        }
    }

    public toggleFullscreen() {
        if(document.fullscreenElement !== document.body) {
            document.body.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    public getPointerPosition(): [ number, number ] {
        let pointerX = 0, pointerY = 0;

        if(this.input.controllers.size > 0 && this.controllerCrosshair != null) {
            pointerX = this.controllerCrosshair.crosshairPosition.x * this.settings.guiScale;
            pointerY = this.controllerCrosshair.crosshairPosition.y * this.settings.guiScale;
        } else if(this.isDesktop) {
            pointerX = this.input.getMouseAxis(MouseAxis.X);
            pointerY = this.input.getMouseAxis(MouseAxis.Y);
        } else if(this.input.touch != null) {
            pointerX = this.input.touch.justEndedTouches.filter(v => v.uiTouch).at(-1)?.x ?? this.input.getTouchAxis(TouchAxis.X, true);
            pointerY = this.input.touch.justEndedTouches.filter(v => v.uiTouch).at(-1)?.y ?? this.input.getTouchAxis(TouchAxis.Y, true);
        }

        return [ pointerX, pointerY ];
    }


    // begin stinky claude box //
    /**
     * PIXI's resetState() assumes every texture unit holds Texture.EMPTY without actually binding it,
     * and its batch shader declares a sampler on every unit. Any integer texture THREE leaves bound
     * fails WebGL's sampler type validation and drops PIXI's draw calls, and an unbound unit makes
     * Texture.EMPTY sample as opaque black, so bind the real empty texture to every unit.
     */
    private bindEmptyTextureUnits() {
        const renderer = this.gui!.renderer as PIXI.WebGLRenderer;
        const gl = renderer.gl;
        const emptyTexture = renderer.texture.getGlSource(PIXI.Texture.EMPTY.source).texture;
        this.textureUnitCount ??= gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) as number;

        for(let unit = 0; unit < this.textureUnitCount; unit++) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, emptyTexture);
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
            gl.bindTexture(gl.TEXTURE_3D, null);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
            gl.bindSampler(unit, null);
        }
        gl.activeTexture(gl.TEXTURE0);
    }
    // end stinky claude box //

    public render() {
        if(this.renderTime >= this.nextFrameAllowed) {
            if(this.settings.maxFramerate > 0) this.nextFrameAllowed = Math.max(
                this.renderTime,
                this.nextFrameAllowed + 1000 / this.settings.maxFramerate
            );
        } else return;

        try {
            const time: Time = Time.fromMsDifference(this.lastRenderTime, this.renderTime, 100);
            this.lastRenderTime = this.renderTime;

            if(this.input.wasPressed(ControlBinding.FULLSCREEN)) this.toggleFullscreen();

            for(const activeStage of this.activeStages) {
                activeStage.tick(time);
            }
            
            this.threeRenderer!.resetState();
            this.renderPipeline!.render();
            this.bindEmptyTextureUnits();
            this.gui!.renderer.resetState();
            this.gui!.render();
            this.controllerCrosshair?.update(time);
            this.input.update();
        } catch(error) {
            this.crash(error);
        }
    }

    public async crash(error?: any) {
        this.onCrash.emit(error);
        this.stop();
    }
}