import { Assets, Container, Sprite, Texture } from "pixi.js";
import { MathUtils, PerspectiveCamera } from "three";
import type { Node } from "three/webgpu";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { BoxelGame } from "../../boxel";
import { ItemHologramProvider } from "../../entity/itemHologram";
import { Player } from "../../entity/player";
import { EventCursor } from "../../events/eventSheet";
import { GuiButton } from "../../gui/element/button";
import { GuiItemSpriteProvider } from "../../gui/element/itemSprite";
import { GuiItemStack } from "../../gui/element/itemStack";
import { GuiText } from "../../gui/element/text";
import { TileHologramProvider } from "../../gui/element/tileHologram";
import { isGuiGraphicContainer } from "../../gui/graphic/graphic";
import { GuiContainer, GuiSlotContainer, InventoryEvent } from "../../gui/guiContainer";
import { GuiManager } from "../../gui/guiManager";
import { guiTypeRegistry } from "../../gui/guiTypeRegistry";
import { DebugMenu, DebugMenuLineAlignment } from "../../gui/prefab/debugMenu";
import { GuiDPadLeft } from "../../gui/prefab/dPadLeft";
import { GuiDPadRight } from "../../gui/prefab/dPadRight";
import { Topbar } from "../../gui/prefab/topbar";
import { ControlBinding } from "../../input/input";
import { MobileController } from "../../input/mobileController";
import { MouseButton } from "../../input/mouse";
import { itemRegistry } from "../../item/itemRegistry";
import { ItemStack } from "../../item/itemStack";
import type { PersistentWorld } from "../../persistence/persistentWorld";
import { WorldRenderer } from "../../rendering/worldRenderer";
import type { Settings } from "../../settings";
import { Time } from "../../time";
import { ChunkLoader } from "../../world/chunkLoader";
import { SimpleTerrainGenerator } from "../../world/simpleTerrainGenerator";
import { World } from "../../world/world";
import { GameStage } from "../gameStage";
import { SettingsScreenStage } from "../settings/settingsGameStage";
import { TitleScreenStage } from "../title/titleScreenStage";
import { PlayerController } from "./playerController";

export class PlayingGameStage extends GameStage {
    public readonly world: World;
    public readonly worldRenderer: WorldRenderer;
    public readonly holdingBlockPreview: GuiItemStack;
    public readonly chunkLoader: ChunkLoader;
    public readonly guiManager: GuiManager;
    public readonly camera = new PerspectiveCamera(90);
    
    public readonly debugMenu = new DebugMenu;
    public readonly debugMenuLines = {
        version: this.debugMenu.createLine(
            DebugMenuLineAlignment.TOP_LEFT, Infinity,
            (version: string) => `Boxel ${version}`
        ),
        queues: this.debugMenu.createLine(
            DebugMenuLineAlignment.TOP_LEFT, 0.05,
            (
                receivingChunks: number, loadingChunks: number, generatingChunks: number,
                meshingChunks: number, savingChunks: number, unloadingChunks: number
            ) =>
                `Wait ${receivingChunks}  Load ${loadingChunks}  Gen ${generatingChunks}  ` +
                `Mesh ${meshingChunks}  Save ${savingChunks}  Unload ${unloadingChunks}`
        ),
        particles: this.debugMenu.createLine(
            DebugMenuLineAlignment.TOP_LEFT, 0.05,
            (
                blockBreakParticles: number
            ) =>
                `Particles ${blockBreakParticles}`
        ),
        player: {
            position: this.debugMenu.createLine(
                DebugMenuLineAlignment.TOP_LEFT, 0.1,
                (x: number, y: number, z: number) => `X ${x}   Y ${y}   Z ${z}`
            ),
            rotation: this.debugMenu.createLine(
                DebugMenuLineAlignment.TOP_LEFT, 0.1,
                (pitch: number, yaw: number) => `Pitch ${pitch}   Yaw ${yaw}`
            ),
            chunk: this.debugMenu.createLine(
                DebugMenuLineAlignment.TOP_LEFT, 0.5,
                (x: number, y: number, z: number) => `In chunk ${x}, ${y}, ${z}`
            ),
            light: this.debugMenu.createLine(
                DebugMenuLineAlignment.TOP_LEFT, 0.25,
                (values: Map<string, number>) =>
                    `Light:  ${values.entries?.().filter(v => v[1]).map(([id, value]) => `${id} ${value}`).toArray().join("  ")}`
            ),
        },
        lookingBlock: {
            position: this.debugMenu.createLine(
                DebugMenuLineAlignment.TOP_RIGHT, 0.05,
                (x: number, y: number, z: number) => `Looking at ${x}, ${y}, ${z}`
            ),
            stateId: this.debugMenu.createLine(
                DebugMenuLineAlignment.TOP_RIGHT, 0.05,
                (blockStateId: string) => blockStateId
            ),
            light: this.debugMenu.createLine(
                DebugMenuLineAlignment.TOP_RIGHT, 0.05,
                (values: Map<string, number>) =>
                    `Light:  ${values.entries?.().filter(v => v[1]).map(([id, value]) => `${id} ${value}`).toArray().join("  ")}`
            ),
            tags: this.debugMenu.createLine(
                DebugMenuLineAlignment.TOP_RIGHT, 0.05,
                (tags: string[]) => tags.join?.("\n") ?? ""
            ),
        },
    }
    
    public readonly playerController: PlayerController;
    public localPlayer?: Player;
    private persistentWorld: PersistentWorld | null = null;
    private paused: boolean = false;
    private worldLoading: boolean = true;
    private autosaveCooldown: number = 0;
    private blockTickInterval: number = 0;

    private longTouched = false;
    private unlockTime = 0;

    private readonly crosshairSprite: Sprite;

    private readonly pausedContainer: Container;
    private readonly pausedBackground: Sprite;
    private readonly pausedText: GuiText;
    private readonly resumeButton: GuiButton;
    private readonly settingsButton: GuiButton;
    private readonly quitButton: GuiButton;
    private readonly guiContainer: Container;
    private hotbarSelection: Sprite | null = null;
    private readonly pointerGuiStack: GuiItemStack;
    private readonly itemGivePanel: Container;

    private readonly pointerStack = ItemStack.empty();

    private readonly tileHologramProvider: TileHologramProvider;
    private readonly itemHologramProvider: ItemHologramProvider;
    private readonly itemSpriteProvider: GuiItemSpriteProvider;
    private readonly mobileController: MobileController | null = null;
    private readonly dPadLeft: GuiDPadLeft | null = null;
    private readonly dPadRight: GuiDPadRight | null = null;
    private readonly topbar: Topbar | null = null;

    public constructor(game: BoxelGame) {
        super(game);

        this.world = new World;
        this.worldRenderer = new WorldRenderer(
            this.world, this.game.textureAtlases!, this.camera, this.game.assets);
        this.chunkLoader = new ChunkLoader(this.world);
        this.playerController = new PlayerController(game);

        this.tileHologramProvider = new TileHologramProvider(game.textureAtlases!);
        this.itemSpriteProvider = new GuiItemSpriteProvider(game.textureAtlases!);
        this.itemHologramProvider = new ItemHologramProvider(game.textureAtlases!);

        this.guiManager = new GuiManager(this.tileHologramProvider, this.itemSpriteProvider);
        this.guiManager.onUpdate.connect(() => {
            this.updateInputLocks();
        });
        this.gui.addChild(this.guiManager.view);

        this.holdingBlockPreview = new GuiItemStack(
            ItemStack.empty(),
            this.tileHologramProvider,
            this.itemSpriteProvider
        );
        this.holdingBlockPreview.scale.set(3);
        this.gui.addChild(this.holdingBlockPreview);

        this.crosshairSprite = new Sprite(Assets.get("base:ui/crosshair.png"));
        this.crosshairSprite.anchor.set(0.5);
        this.crosshairSprite.scale.set(0.5);
        this.gui.addChild(this.crosshairSprite);

        this.guiContainer = new Container;
        this.guiContainer.position.set(0, 0);
        this.gui.addChild(this.guiContainer);
        this.guiContainer.interactive = true;

        this.pointerGuiStack = new GuiItemStack(this.pointerStack, this.tileHologramProvider, this.itemSpriteProvider);
        this.gui.addChild(this.pointerGuiStack);
        this.pointerGuiStack.interactive = false;
        this.pointerGuiStack.zIndex = 10;

        this.itemGivePanel = new Container;
        this.itemGivePanel.visible = false;

        this.debugMenu.view.zIndex = 30;
        this.debugMenu.view.visible = false;
        this.gui.addChild(this.debugMenu.view);
        this.debugMenuLines.version.setData(this.game.version);

        const giveMenuItems = new Set<string>;

        for(const [ blockStateKey, blockState ] of blockStateRegistry.entries()) {
            if(blockState.tags.has("hidden")) continue;

            giveMenuItems.add(blockStateKey);
        }

        for(const [ itemId, item ] of itemRegistry.entries()) {
            if(item.tags.has("hidden")) continue;

            giveMenuItems.add(itemId);
        }

        let i = 0;
        for(const itemId of giveMenuItems) {
            const x = i % 5;
            const y = (i / 5) | 0;

            const stack = ItemStack.of(itemId, 1);
            const button = new GuiItemStack(stack, this.tileHologramProvider, this.itemSpriteProvider);

            button.interactive = true;
            button.on("pointerdown", () => {
                const clone = stack.clone();
                clone.mergeInto(this.pointerStack);
                if(!clone.isEmpty()) this.pointerStack.clear();
            });

            button.position.set(x * 16, y * 16);
            this.itemGivePanel.addChild(button);
            i++;
        }

        this.itemGivePanel.pivot.set(72, -10);
        this.gui.addChild(this.itemGivePanel);
        
        if(!this.game.isDesktop) {
            this.dPadLeft = new GuiDPadLeft;
            this.dPadRight = new GuiDPadRight;
            this.topbar = new Topbar;
            this.gui.addChild(this.dPadLeft, this.dPadRight, this.topbar);

            this.mobileController = new MobileController(this.dPadLeft, this.dPadRight, this.topbar);
            game.input.attachMobileController(this.mobileController);
        }

        this.pausedContainer = new Container();
        this.pausedContainer.origin.set(0, 0);
        
        this.pausedBackground = new Sprite(Texture.WHITE);
        this.pausedBackground.origin.set(0, 0);
        this.pausedBackground.tint = 0x000000;
        this.pausedBackground.alpha = 0.25;
        this.pausedBackground.interactive = true;

        this.pausedText = new GuiText({
            text: "Paused",
            fontScale: 2,
            align: "center"
        });
        this.pausedText.setAnchor(0.5, 0.5);

        this.resumeButton = new GuiButton("Resume", 100, 30);
        this.resumeButton.on("pointerdown", () => {
            this.game.audioManager.playMenuBack();
            this.setPaused(false);
        });

        this.settingsButton = new GuiButton("Settings", 100, 30);
        this.settingsButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new SettingsScreenStage(game));
        });

        this.quitButton = new GuiButton("Save and Quit", 100, 30);
        this.quitButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.save().then(() => {
                this.game.changeStage(new TitleScreenStage(game), false);
            });
        });

        this.pausedContainer.addChild(
            this.pausedBackground,
            this.pausedText,
            this.resumeButton,
            this.settingsButton,
            this.quitButton
        );
        
        this.pausedContainer.visible = false;

        this.gui.addChild(this.pausedContainer);

        EventCursor.setClientPlatform({
            usingTouchscreen: !this.game.isDesktop,
            guiManager: this.guiManager,
            audioManager: this.game.audioManager,
            blockBreakParticles: this.worldRenderer.blockBreakParticles
        });

        this.camera.add(this.game.audioManager.listener);
        this.worldRenderer.scene.add(this.game.audioManager.root);
    }
    public getRenderPass(): Node<"vec4"> {
        return this.worldRenderer.getRenderPass();
    }
    public async openWorld(worldId: string) {
        this.persistentWorld = this.game.persistenceManager.openWorld(worldId);

        this.world.setPersistentWorld(this.persistentWorld);
        this.world.setTerrainGenerator(new SimpleTerrainGenerator());

        await this.world.loadWorld();
        
        const playerSlot = await this.world.loadPlayerSlot("local");
        this.localPlayer = new Player(this.world);
        this.playerController.setPlayer(this.localPlayer);

        if(playerSlot.position == null) playerSlot.position = [ 0, 100, 0 ];
        this.localPlayer.deserialize(playerSlot);

        const inventories = new Map([
            ["player", this.localPlayer.inventory]
        ]);
        const hotbarGuiType = guiTypeRegistry.get("base:hotbar");
        if(hotbarGuiType != null) {
            const hotbar = this.guiManager.openGui(hotbarGuiType.createGui(inventories));

            this.hotbarSelection = new Sprite(Assets.get("base:ui/hotbar_selection.png"));
            hotbar.addChild(this.hotbarSelection);
        }

        this.worldLoading = false;
        this.setPaused(false);

        this.worldRenderer.create();

        let lastTickMs = performance.now();
        this.blockTickInterval = setInterval(() => {
            const currentTickMs = performance.now();
            const time = Time.fromMsDifference(lastTickMs, currentTickMs, 1000);
            lastTickMs = currentTickMs;
            
            if(this.paused) return;
            this.tickFixed(time);
        }, 1000 / 20);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.camera.aspect = width / height;

        this.holdingBlockPreview.position.set(28, 28);
        this.crosshairSprite.position.set(width / 2, height / 2);

        if(this.dPadLeft != null) {
            this.dPadLeft.position.set(0, height);
        }
        if(this.dPadRight != null) {
            this.dPadRight.position.set(width, height);
        }
        if(this.topbar != null) {
            this.topbar.position.set(width / 2, 0);
            this.topbar.setTopbarSize(width);
        }

        this.pausedText.position.set(width / 2, 20);
        this.resumeButton.position.set(width / 2, height - 88);
        this.settingsButton.position.set(width / 2, height - 54);
        this.quitButton.position.set(width / 2, height - 20);
        this.pausedBackground.setSize(width, height);
        this.pausedContainer.setSize(width, height);
        this.itemGivePanel.position.set(width, 0);

        this.guiManager.resize(width, height, pixelRatio);
        this.debugMenu.resize(width, height);
    }

    public setPaused(paused: boolean) {
        this.paused = paused;
            
        this.worldRenderer.setPaused(paused);

        if(paused) {
            this.pausedContainer.visible = true;

            this.game.controllerCrosshair?.crosshairPosition
                .set(this.game.guiWidth / 2, this.game.guiHeight / 2);
        } else {
            this.pausedContainer.visible = false;
        }

        this.updateInputLocks();
    }

    public updateInputLocks() {
        if(this.guiManager.getOpenModalCount() > 0 || this.paused) {
            if(this.game.isDesktop) {
                this.game.input.mouse?.unlock();
                this.game.input.keyboard?.unlock();
            }
            this.game.controllerCrosshair?.enable();
        } else {
            if(this.game.isDesktop) {
                this.game.input.mouse?.lock();
                this.game.input.keyboard?.lock();
            }
            this.game.controllerCrosshair?.disable();
        }
    }

    public updateSettings(settings: Settings) {
        this.chunkLoader.setRadius(settings.renderDistance);
        this.chunkLoader.maxColumnLoads = settings.maxColumnLoads;
        this.chunkLoader.maxColumnGenerations = settings.maxColumnGenerations;
        
        this.worldRenderer.fogDistance.value = Math.max(8, settings.renderDistance - 32);
        this.worldRenderer.maxChunkUpdates = settings.maxChunkUpdates;

        if(this.dPadLeft != null) {
            this.dPadLeft.scale.set(settings.dPadScale);
        }
        if(this.dPadRight != null) {
            this.dPadRight.scale.set(settings.dPadScale);
        }
    }

    public tickFixed(time: Time) {
        this.world.tick(time);

        if(this.localPlayer != null) {
            const player = this.localPlayer;

            const pickedUp = player.pickupNearbyItems(time, 1.25, 12, 0.25, -0.5, 2.5);

            for(let i = 0; i < pickedUp; i++) {
                const j = Math.floor(Math.random() * 3);

                setTimeout(() => {
                    const sound = this.game.audioManager.playSound3d(
                        "base:entity/item_pickup/regular_" + j,
                        player.position.x,
                        player.position.y,
                        player.position.z
                    );
                    
                    sound?.setPlaybackRate(0.6 + Math.random() * 0.2);
                }, Math.random() * (1000 / 20));
            }
        }
    }

    public tick(time: Time) {
        if(this.worldLoading) return;

        const game = this.game;

        this.autosaveCooldown -= time.deltaTime;

        if(this.autosaveCooldown <= 0) {
            this.save();

            this.autosaveCooldown = 10;
        }

        if(this.isTopmostStage()) {
            if(game.input.wasPressed(ControlBinding.PAUSE)) {
                if(this.paused) {
                    this.setPaused(false);
                } else {
                    this.setPaused(true);
                    this.save();
                }
            } else if(game.input.wasPressed(ControlBinding.BACK) && this.paused) {
                this.setPaused(false);
                this.unlockTime = 0;
            }
        }

        if(game.input.mouse != null && game.input.controllers.size == 0 && game.isDesktop) {
            const pointerUnlockers = (this.paused ? 1 : 0) + this.guiManager.getOpenModalCount();
            if(game.input.mouse.isCurrentlyLocked() || pointerUnlockers > 0) {
                this.unlockTime = 0;
            } else {
                this.unlockTime += time.deltaTime;
            }
            if(
                (this.unlockTime > 1 && this.game.settings.pauseIfUnlocked)
                || (game.input.mouse.wasPressed(MouseButton.UNLOCK) && pointerUnlockers == 0)
            ) {
                this.setPaused(true);
            }
        }

        if(!this.paused && this.localPlayer != null) {
            const topModal = this.guiManager.getTopModal();
            if(topModal != null) {
                if(game.input.wasPressed(ControlBinding.CLOSE_MODAL) || game.input.wasPressed(ControlBinding.BACK)) {
                    this.guiManager.closeGui(topModal.graphicalInterface.type.id);
                    this.localPlayer.inventory.addStack(this.pointerStack);
                }
            } else {
                if(game.input.wasPressed(ControlBinding.OPEN_INVENTORY)) {
                    const inventoryType = guiTypeRegistry.get("base:player_inventory")!;

                    const inventories = new Map([
                        ["player", this.localPlayer.inventory]
                    ]);
                    const gui = inventoryType.createGui(inventories);
                    this.guiManager.openGui(gui);
                }
            }

            this.updateOpenGUIs();

            if(this.guiManager.getOpenModalCount() == 0) {
                this.playerController.update(time);
            }

            this.localPlayer.tick(time);
            this.playerController.updateTargetedBlock(this.worldRenderer.targetedBlock)
                    
            const hotbar = this.guiManager.getOpenGui("base:hotbar");
            hotbar?.updateSlot("player." + this.localPlayer.selectedSlot);

            this.hotbarSelection?.position.set(
                this.localPlayer.selectedSlot * 23 + 13,
                8
            );

            this.holdingBlockPreview.setItemStack(
                this.localPlayer.inventory.slots[this.localPlayer.selectedSlot]!.stack);

            this.chunkLoader.moveOrigin(this.localPlayer.position);
            this.chunkLoader.update(time);

            this.updateCamera(time);
        }

        if(this.game.controllerCrosshair?.visible) {
            this.pointerGuiStack.position.set(
                this.game.controllerCrosshair.crosshairPosition.x,
                this.game.controllerCrosshair.crosshairPosition.y
            )
            this.pointerGuiStack.visible = true;
        } else if(this.game.input.mouse != null) {
            this.pointerGuiStack.position.set(
                this.game.input.mouse.x / this.game.settings.guiScale,
                this.game.input.mouse.y / this.game.settings.guiScale
            )
            this.pointerGuiStack.visible = true;
        } else {
            this.pointerGuiStack.visible = false;
        }

        this.pointerGuiStack.alpha = this.game.isDesktop ? 1 : 0.67;
        this.pointerGuiStack.scale = this.game.isDesktop ? (20/16) : (40/16);
        this.itemGivePanel.visible = this.guiManager.isGuiOpen("base:player_inventory");
        
        if(this.pointerGuiStack.visible) {
            this.pointerGuiStack.updateDisplayItem();
        }

        // copy the sky color from the world renderer's sky to the lighting channel color value
        this.world.lightingManager.getChannelOrThrow("base:sky").color.value.copy(
            this.worldRenderer.sky.sunlightColor.value);

        if(this.localPlayer != null) {
            this.guiManager.update(this.localPlayer.createEventCursor());
        }
        
        this.camera.updateProjectionMatrix();
        this.worldRenderer.render(time);
        
        try {
            this.updateDebugMenu(time);
        } catch(e) {
            console.error(new Error("Failed to update debug menu", { cause: e }));
        }
    }

    private updateOpenGUIs() {
        const game = this.game;

        const [ cursorX, cursorY ] = this.game.getPointerPosition();

        const bounds = game.gui.canvas.getBoundingClientRect();
        const localX = cursorX - bounds.left;
        const localY = cursorY - bounds.top;
        
        const target = game.gui.renderer.events.rootBoundary.hitTest(localX, localY);
        
        let guiContainer: Container | null = target;
        while(guiContainer != null && !(guiContainer instanceof GuiContainer)) guiContainer = guiContainer.parent;

        let slotContainer: Container | null = target;
        while(slotContainer != null && !(slotContainer instanceof GuiSlotContainer)) slotContainer = slotContainer.parent;

        let guiGraphic: Container | null = target;
        while(guiGraphic != null && !isGuiGraphicContainer(guiGraphic)) guiGraphic = guiGraphic.parent;

        if(guiContainer == null || slotContainer == null) {
            const inventoryEvent = new InventoryEvent(this.pointerStack, null, null);

            this.guiManager.guiCursor.onSelectSlot.emit(inventoryEvent);
        } else {
            const gui = guiContainer.graphicalInterface;
            const guiSlot = slotContainer.guiSlot;

            const inventoryEvent = new InventoryEvent(this.pointerStack, guiSlot.type.id, gui);

            this.guiManager.guiCursor.onSelectSlot.emit(inventoryEvent);

            let swapStack = false;
            let dropOne = false;
            let splitStack = false;
            let quickMove = false;

            if(game.isDesktop) {
                swapStack = game.input.wasPressed(ControlBinding.SWAP_STACK);
                dropOne = game.input.wasPressed(ControlBinding.DROP_ONE);
                splitStack = game.input.wasPressed(ControlBinding.SPLIT_STACK);
                quickMove = game.input.wasPressed(ControlBinding.QUICK_MOVE);
            } else if(this.game.input.touch != null) {
                const slotStack = guiSlot.slot.stack;
                const endedTouch = this.game.input.touch.justEndedTouches.at(-1);
                
                if(endedTouch?.uiTouch) {
                    if(!this.longTouched) {
                        if(this.pointerStack.isEmpty()) {
                            swapStack = true;
                        } else {
                            if(slotStack == null || slotStack.isEmpty()) {
                                swapStack = true;
                            } else {
                                dropOne = true;
                            }
                        }
                    }
                } else {
                    const firstTouch = this.game.input.getFirstTouch(true);

                    if(firstTouch != null && firstTouch.duration > 0.5) {
                        if(!this.longTouched) {
                            this.longTouched = true;
                            if(this.pointerStack.isEmpty()) {
                                splitStack = true;
                            } else {
                                if(slotStack == null || slotStack.isEmpty()) {
                                    dropOne = true;
                                } else {
                                    swapStack = true;
                                }
                            }
                        }
                    } else {
                        this.longTouched = false;
                    }
                }
            }

            if(quickMove && !inventoryEvent.consumed) {
                this.guiManager.guiCursor.onQuickMove.emit(inventoryEvent);
            }
            if(swapStack && !inventoryEvent.consumed) {
                this.guiManager.guiCursor.onSwapStack.emit(inventoryEvent);
            }
            if(dropOne && !inventoryEvent.consumed) {
                this.guiManager.guiCursor.onDropOne.emit(inventoryEvent);
            }
            if(splitStack && !inventoryEvent.consumed) {
                this.guiManager.guiCursor.onSplitStack.emit(inventoryEvent);
            }
        }

        if(guiContainer != null && guiGraphic != null && this.localPlayer != null) {
            const cursor = this.localPlayer.createEventCursor();
            
            if(game.input.wasPressed(ControlBinding.PRESS_UI) || game.input.touch?.justStartedTouches.length) {
                const gui = guiContainer.graphicalInterface;
                const graphicId = guiGraphic.graphicId;

                const graphic = gui.graphics.get(graphicId);
                graphic?.type.events.runTrigger("base:ui/press_down", cursor);
            }
        }
    }

    private updateCamera(time: Time) {
        if(this.localPlayer == null) return;

        this.camera.fov = MathUtils.lerp(
            this.camera.fov,
            this.game.settings.fov + (this.localPlayer.sprinting ? 10 : 0),
            1 - 0.5 ** (time.deltaTime * 20)
        );
        this.camera.position.set(
            this.localPlayer.position.x,
            this.localPlayer.position.y + this.localPlayer.eyeHeight,
            this.localPlayer.position.z
        );
        this.camera.rotation.set(this.localPlayer.pitch, -this.localPlayer.yaw, 0, "YZX");
    }

    private updateDebugMenu(time: Time) {
        if(this.game.input.wasPressed(ControlBinding.TOGGLE_DEBUG)) {
            this.debugMenu.view.visible = !this.debugMenu.view.visible;
            this.worldRenderer.setDebug(this.debugMenu.view.visible);
        }

        if(this.debugMenu.view.visible) {
            this.debugMenuLines.queues.setData(
                this.world.loadingChunks.size,
                this.chunkLoader.columnLoadQueue.size(),
                this.chunkLoader.columnGenerationQueue.size(),
                this.worldRenderer.dirtyChunks.size + this.worldRenderer.priorityDirtyChunks.size,
                this.world.chunksToSave.size,
                this.chunkLoader.chunksToHide.size
            );
            this.debugMenuLines.particles.setData(
                this.worldRenderer.blockBreakParticles.particleCount
            );
            if(this.localPlayer != null) {
                this.debugMenuLines.player.position.setData(
                    this.localPlayer.position.x,
                    this.localPlayer.position.y,
                    this.localPlayer.position.z,
                );
                this.debugMenuLines.player.rotation.setData(
                    this.localPlayer.pitch,
                    this.localPlayer.yaw,
                );

                if(this.localPlayer.chunk == null) {
                    this.debugMenuLines.player.light.setData(new Map);
                } else {
                    const light = new Map<string, number>;
                    this.world.lightingManager.getColorMap(
                        Math.floor(this.localPlayer.position.x),
                        Math.floor(this.localPlayer.position.y),
                        Math.floor(this.localPlayer.position.z),
                        light
                    )
                    this.debugMenuLines.player.light.setData(light);
                }
                this.debugMenuLines.player.chunk.setData(
                    Math.floor(this.localPlayer.position.x) >> 4,
                    Math.floor(this.localPlayer.position.y) >> 4,
                    Math.floor(this.localPlayer.position.z) >> 4
                );
                if(this.localPlayer.targetedBlock.hit) {
                    this.debugMenuLines.lookingBlock.position.show();
                    this.debugMenuLines.lookingBlock.position.setData(
                        this.localPlayer.targetedBlock.voxel.x,
                        this.localPlayer.targetedBlock.voxel.y,
                        this.localPlayer.targetedBlock.voxel.z
                    );
                    const targetedBlockStateId = this.world.getBlockState(
                        this.localPlayer.targetedBlock.voxel.x,
                        this.localPlayer.targetedBlock.voxel.y,
                        this.localPlayer.targetedBlock.voxel.z
                    );
                    const targetedBlockState = blockStateRegistry.get(targetedBlockStateId);

                    this.debugMenuLines.lookingBlock.stateId.show();
                    this.debugMenuLines.lookingBlock.stateId.setData(targetedBlockStateId);

                    this.debugMenuLines.lookingBlock.light.show();
                    const light = new Map<string, number>;
                    this.world.lightingManager.getColorMap(
                        this.localPlayer.targetedBlock.voxel.x + this.localPlayer.targetedBlock.side.x,
                        this.localPlayer.targetedBlock.voxel.y + this.localPlayer.targetedBlock.side.y,
                        this.localPlayer.targetedBlock.voxel.z + this.localPlayer.targetedBlock.side.z,
                        light
                    );
                    this.debugMenuLines.lookingBlock.light.setData(light);

                    if(targetedBlockState != null) {
                        this.debugMenuLines.lookingBlock.tags.show();
                        this.debugMenuLines.lookingBlock.tags.setData(Array.from(targetedBlockState.tags));
                    }
                }
            } else {
                this.debugMenuLines.lookingBlock.position.hide();
                this.debugMenuLines.lookingBlock.stateId.hide();
                this.debugMenuLines.lookingBlock.light.hide();
                this.debugMenuLines.lookingBlock.tags.hide();
            }
        }

        this.debugMenu.update(time);
    }

    private async save() {
        await this.world.saveWorld();
        
        if(this.localPlayer != null) {
            await this.world.savePlayerSlot(this.localPlayer.serialize());
        }
    }

    public unload(): void {
        if(this.persistentWorld != null) {
            this.game.persistenceManager.closeWorld(this.persistentWorld);
        }

        this.setPaused(true);

        if(!this.game.isDesktop) {
            this.game.input.detachMobileController();
        }
        clearInterval(this.blockTickInterval);
    }
}