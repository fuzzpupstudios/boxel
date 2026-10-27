import { Assets, Container, Sprite, Texture } from "pixi.js";
import { Frustum, MathUtils, Matrix4, PerspectiveCamera } from "three";
import type { Node } from "three/webgpu";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { BoxelGame } from "../../boxel";
import { Chat } from "../../chat/chat";
import { CommandExecutor } from "../../chat/command/commandExecutor";
import { ItemHologramProvider } from "../../entity/itemHologram";
import { Player } from "../../entity/player";
import { EventCursor } from "../../events/eventSheet";
import { GuiButton } from "../../gui/element/button";
import { GuiContainer, GuiSlotContainer } from "../../gui/element/guiContainer";
import { GuiItemSpriteProvider } from "../../gui/element/itemSprite";
import { GuiItemStack } from "../../gui/element/itemStack";
import { GuiText } from "../../gui/element/text";
import { TileHologramProvider } from "../../gui/element/tileHologram";
import { isGuiGraphicContainer } from "../../gui/graphic/graphic";
import { InventoryEvent } from "../../gui/guiCursor";
import { GuiManager } from "../../gui/guiManager";
import { guiTypeRegistry } from "../../gui/guiTypeRegistry";
import { ChatGUI } from "../../gui/prefab/chat";
import { DebugMenu, DebugMenuLineAlignment } from "../../gui/prefab/debugMenu";
import { GuiDPadLeft } from "../../gui/prefab/dPadLeft";
import { GuiDPadRight } from "../../gui/prefab/dPadRight";
import { Topbar } from "../../gui/prefab/topbar";
import { ControlBinding } from "../../input/input";
import { MobileController } from "../../input/mobileController";
import { itemRegistry } from "../../item/itemRegistry";
import { ItemStack } from "../../item/itemStack";
import type { PersistentWorld } from "../../persistence/persistentWorld";
import { WorldRenderer } from "../../rendering/worldRenderer";
import type { Settings } from "../../settings";
import { Time } from "../../time";
import { CaveTerrainGenerator } from "../../world/caves/caveTerrainGenerator";
import { ChunkLoader } from "../../world/chunkLoader";
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
    public readonly chat = new Chat;
    public readonly chatGui = new ChatGUI(this.chat);
    public readonly debugMenuLines = {
        version: this.debugMenu.createLine(
            DebugMenuLineAlignment.TOP_LEFT, Infinity,
            (version: string) => `Boxel ${version}`
        ),
        framerate: this.debugMenu.createLine(
            DebugMenuLineAlignment.TOP_LEFT, 1,
            (framerate: number, maxFramerate: number) => maxFramerate == 0 ? `${framerate} FPS` : `${framerate} / ${maxFramerate} FPS`
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
        counters: this.debugMenu.createLine(
            DebugMenuLineAlignment.TOP_LEFT, 0.05,
            (
                blockBreakParticles: number,
                entities: number,
                drawCalls: number,
                individualChunks: number,
                batchedChunks: number,
            ) =>
                `P ${blockBreakParticles}  E ${entities}  D ${drawCalls}  I ${individualChunks}  B ${batchedChunks}`
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
    private frameCounter = new Array<Time>;

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

    private readonly tileHologramProvider: TileHologramProvider;
    private readonly itemHologramProvider: ItemHologramProvider;
    private readonly itemSpriteProvider: GuiItemSpriteProvider;
    private readonly mobileController: MobileController | null = null;
    private readonly dPadLeft: GuiDPadLeft | null = null;
    private readonly dPadRight: GuiDPadRight | null = null;
    private readonly topbar: Topbar | null = null;
    private clearInputNextFrame: boolean = false;

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

        this.guiManager = new GuiManager(this.tileHologramProvider, this.itemSpriteProvider, game.input.pointerLock!);
        this.gui.addChild(this.guiManager.view);
        this.guiManager.onUpdate.connect(() => {
            this.updateInputLocks();
        });

        if(game.input.pointerLock) {
            game.input.pointerLock.onUnlock.connect(() => {
                if(!this.chatGui.messageBarOpen && this.guiManager.getOpenModalCount() === 0) {
                    this.setPaused(true);
                }
            });
        }

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

        this.pointerGuiStack = new GuiItemStack(ItemStack.empty(), this.tileHologramProvider, this.itemSpriteProvider);
        this.gui.addChild(this.pointerGuiStack);
        this.pointerGuiStack.interactive = false;
        this.pointerGuiStack.zIndex = 11;

        this.itemGivePanel = new Container;
        this.itemGivePanel.visible = false;

        this.debugMenu.view.zIndex = 30;
        this.debugMenu.view.visible = false;
        this.gui.addChild(this.debugMenu.view);
        this.debugMenuLines.version.setData(this.game.version);

        this.chatGui.zIndex = 5;
        this.chatGui.onClose.connect(async () => {
            if(this.controlAllowed) {
                try {
                    await this.game.input.pointerLock?.lock();
                    this.updateInputLocks();
                } catch(e) {
                    this.chatGui.openMessageBar("");
                }
            }
        });
        this.chatGui.onMessage.connect(message => {
            this.chat.log(`<${this.localPlayer?.id}> ${message}`);
        });
        this.chatGui.onCommand.connect(command => {
            const executor = new CommandExecutor(this.chat, this);
            if(this.localPlayer) executor.setEntity(this.localPlayer);

            try {
                command.execute(executor);
            } catch(e) {
                console.error(e);
                this.chat.log("An error occurred whilst running /" + command.calledName);
            }
        });
        this.gui.addChild(this.chatGui);

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
                if(this.game.input.isPressed(ControlBinding.CROUCH)) {
                    clone.quantity = stack.getStackSize();
                }
                const pointerSlot = this.localPlayer?.pointerInventory.slots[0];
                if(pointerSlot != null) {
                    clone.mergeInto(pointerSlot.stack);
                    pointerSlot.update();
                }
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
        this.pausedContainer.zIndex = 20;
        
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
            
            this.clearInputNextFrame = true;
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
        
        const generator = new CaveTerrainGenerator();
        await generator.init();
        this.world.setTerrainGenerator(generator);

        await this.world.loadWorld();
        await this.worldRenderer.init();
        
        const playerSlot = await this.world.loadPlayerSlot("local");
        this.localPlayer = new Player(this.world);
        this.playerController.setPlayer(this.localPlayer);

        this.pointerGuiStack.stack = this.localPlayer.pointerInventory.slots[0].stack;
        this.localPlayer.pointerInventory.onUpdate.connect(slotId => {
            if(slotId == 0) this.pointerGuiStack.updateDisplayItem();
        })

        if(playerSlot.position == null) playerSlot.position = [ 0.5, 64, 0.5 ];
        this.localPlayer.deserialize(playerSlot);

        const inventories = new Map([
            ["player", this.localPlayer.inventory]
        ]);
        const hotbarGuiType = guiTypeRegistry.get("base:hotbar");
        if(hotbarGuiType != null) {
            const hotbarGui = hotbarGuiType.createGui(inventories);
            const hotbar = this.guiManager.openGui(hotbarGui, this.localPlayer.createEventCursor(), 3);

            this.hotbarSelection = new Sprite(Assets.get("base:ui/hotbar_selection.png"));
            hotbar.addChild(this.hotbarSelection);
        }

        this.worldLoading = false;
        this.setPaused(false);

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
        this.chatGui.resize(width, height);
    }

    private get controlAllowed() {
        return !this.paused && this.isTopmostStage() && !this.chatGui.messageBarOpen && this.guiManager.getOpenModalCount() === 0;
    }

    public async setPaused(paused: boolean) {
        if(paused) {
            this.game.input.pointerLock?.unlock();
        } else {
            await this.game.input.pointerLock?.lock();
        }
        this.updateInputLocks();

        this.paused = paused;
        this.worldRenderer.setPaused(paused);
        
        
        if(paused) {
            this.pausedContainer.visible = true;
            
            this.game.controllerCrosshair?.crosshairPosition
            .set(this.game.guiWidth / 2, this.game.guiHeight / 2);
        } else {
            this.pausedContainer.visible = false;
        }
        
        await this.save();
    }

    public updateInputLocks() {
        if(this.guiManager.getOpenModalCount() > 0 || this.paused) {
            if(this.game.isDesktop) {
                this.game.input.keyboard?.unlock();
            }
            this.game.controllerCrosshair?.enable();
        } else {
            if(this.game.isDesktop) {
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
        this.worldRenderer.maxRegionUpdates = settings.maxRegionUpdates;

        this.worldRenderer.setRenderDistance(settings.renderDistance);

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

            const pickedUpStacks = player.pickupNearbyItems(time, 1.25, 12, 0.25, -0.5, 2.5);

            for(const stack of pickedUpStacks) {
                const j = Math.floor(Math.random() * 3);
                
                const twinge = Math.min((stack.quantity / 512) ** 0.3, 1);

                setTimeout(() => {
                    const sound = this.game.audioManager.playSound3d(
                        "base:entity/item_pickup/regular_" + j,
                        player.position.x,
                        player.position.y,
                        player.position.z
                    );
                    
                    sound?.setPlaybackRate(1 + Math.random() * 0.2 - twinge * 0.8);
                }, Math.random() * (1000 / 20));
            }
                    
            const hotbar = this.guiManager.getOpenGui("base:hotbar");
            hotbar?.updateSlot("player." + this.localPlayer.selectedSlot);
            this.holdingBlockPreview.updateDisplayItem();

            this.guiManager.update(this.localPlayer.createEventCursor());
        

            this.playerController.updateTargetedBlock(this.worldRenderer.targetedBlock);
            this.playerController.updateBreakingBlock(this.worldRenderer.breakingBlock);


            const selectedStack = this.localPlayer.inventory.slots[this.localPlayer.selectedSlot].stack;
            if(this.holdingBlockPreview.stack != selectedStack) {
                this.holdingBlockPreview.stack = selectedStack;
                this.holdingBlockPreview.updateDisplayItem();
            }

            this.chunkLoader.moveOrigin(this.localPlayer.position);
            this.worldRenderer.setLoadingOrigin(
                this.localPlayer.position.x,
                this.localPlayer.position.y,
                this.localPlayer.position.z
            );
        }

        this.pointerGuiStack.alpha = this.game.isDesktop ? 1 : 0.67;
        this.pointerGuiStack.scale = this.game.isDesktop ? (20/16) : (40/16);
        this.itemGivePanel.visible = this.guiManager.isGuiOpen("base:player_inventory");
        
        try {
            this.updateDebugMenu(time);
        } catch(e) {
            console.error(new Error("Failed to update debug menu", { cause: e }));
        }
    }

    public tick(time: Time) {
        if(this.worldLoading) return;

        if(this.clearInputNextFrame) {
            this.game.input.clearAll();
            this.clearInputNextFrame = false;
        }

        const game = this.game;

        this.autosaveCooldown -= time.deltaTime;

        if(this.autosaveCooldown <= 0) {
            this.save();

            this.autosaveCooldown = 10;
        }

        this.frameCounter.push(time);
        while(this.frameCounter.length > 0 && time.seconds - this.frameCounter[0].seconds > 1) this.frameCounter.shift();
        this.debugMenuLines.framerate.setData(this.frameCounter.length, this.game.settings.maxFramerate);


        if(this.controlAllowed) {
            if(game.input.wasPressed(ControlBinding.PAUSE) || game.input.wasPressed(ControlBinding.BACK)) {
                this.setPaused(true);
            }
        } else {
            if(this.paused) {
                if(game.input.wasUnpressed(ControlBinding.PAUSE) || game.input.wasUnpressed(ControlBinding.BACK)) {
                    this.setPaused(false);
                }
            } else if(this.chatGui.messageBarOpen) {
                if(game.input.wasUnpressed(ControlBinding.BACK)) {
                    this.game.input.pointerLock?.lock().then(() => {
                        this.updateInputLocks();
                        this.chatGui.closeMessageBar();
                    })
                }
            }
        }

        if(!this.paused && this.localPlayer != null) {
            const topModal = this.guiManager.getTopModal();
            if(topModal != null) {
                if(game.input.wasPressed(ControlBinding.CLOSE_MODAL) || game.input.wasUnpressed(ControlBinding.BACK)) {
                    this.guiManager.closeGui(topModal.gui.type.id);
                    this.localPlayer.inventory.addStack(this.localPlayer.pointerInventory.slots[0].stack);
                }
            } else if(this.controlAllowed) {
                if(game.input.wasPressed(ControlBinding.OPEN_INVENTORY)) {
                    const inventoryType = guiTypeRegistry.get("base:player_inventory")!;

                    const inventories = new Map([
                        ["player", this.localPlayer.inventory]
                    ]);
                    const gui = inventoryType.createGui(inventories);
                    this.guiManager.openGui(gui, this.localPlayer.createEventCursor(), 7);
                }
            }

            if(this.game.input.wasPressed(ControlBinding.TOGGLE_DEBUG)) {
                this.debugMenu.view.visible = !this.debugMenu.view.visible;
                this.worldRenderer.setDebug(this.debugMenu.view.visible);
            }

            this.updateOpenGUIs(time);

            if(this.controlAllowed) {
                this.playerController.update(time);
            }

            this.localPlayer.tick(time);

            this.hotbarSelection?.position.set(
                this.localPlayer.selectedSlot * 23 + 13,
                8
            );
            
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

        if(this.controlAllowed) {
            if(this.game.input.wasPressed(ControlBinding.OPEN_CHAT)) {
                this.game.input.pointerLock?.unlock();
                this.updateInputLocks();
                this.chatGui.openMessageBar();
            }
            if(this.game.input.wasPressed(ControlBinding.OPEN_COMMAND)) {
                this.game.input.pointerLock?.unlock();
                this.updateInputLocks();
                this.chatGui.openMessageBar("/");
            }
        }
        if(this.chatGui.messageBarOpen) {
            if(this.game.input.wasPressed(ControlBinding.CHAT_HISTORY_OLDER)) {
                this.chatGui.messageBar.olderHistory();
            }
            if(this.game.input.wasPressed(ControlBinding.CHAT_HISTORY_NEWER)) {
                this.chatGui.messageBar.newerHistory();
            }
            if(this.game.input.wasPressed(ControlBinding.SUBMIT_CHAT_MESSAGE)) {
                this.chatGui.messageBar.trySubmit();
            }
        }

        // copy the sky color from the world renderer's sky to the lighting channel color value
        this.world.lightingManager.getChannelOrThrow("base:sky").color.value.copy(
            this.worldRenderer.sky.sunlightColor.value);
        
        this.camera.updateProjectionMatrix();
        this.worldRenderer.render(time);
    }

    private lastLocalX: number = 0;
    private lastLocalY: number = 0;
    private lastTarget: Container | null = null;

    private updateOpenGUIs(time: Time) {
        const game = this.game;

        const [ pointerX, pointerY ] = this.game.getPointerPosition();

        const bounds = game.gui!.canvas.getBoundingClientRect();
        const localX = pointerX - bounds.left;
        const localY = pointerY - bounds.top;
        
        // hitTest() is expensive (~0.22ms), so only run it when the pointer moves
        let target = this.lastTarget;
        if(this.lastLocalX != localX || this.lastLocalY != localY) {
            this.lastLocalX = localX;
            this.lastLocalY = localY;

            target = game.gui!.renderer.events.rootBoundary.hitTest(localX, localY);
            this.lastTarget = target;
        }
        
        let guiContainer: Container | null = target;
        while(guiContainer != null && !(guiContainer instanceof GuiContainer)) guiContainer = guiContainer.parent;

        let slotContainer: Container | null = target;
        while(slotContainer != null && !(slotContainer instanceof GuiSlotContainer)) slotContainer = slotContainer.parent;

        let guiGraphic: Container | null = target;
        while(guiGraphic != null && !isGuiGraphicContainer(guiGraphic)) guiGraphic = guiGraphic.parent;

        const pointerSlot = this.localPlayer?.pointerInventory.slots[0];

        if(pointerSlot != null) {
            if(guiContainer == null || slotContainer == null) {
                const inventoryEvent = new InventoryEvent(pointerSlot, null, null);

                this.guiManager.guiCursor.onSelectSlot.emit(inventoryEvent);
            } else {
                const gui = guiContainer.gui;
                const guiSlot = slotContainer.guiSlot;

                const inventoryEvent = new InventoryEvent(pointerSlot, guiSlot.type.id, gui);

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
                            if(pointerSlot.stack.isEmpty()) {
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
                                if(pointerSlot.stack.isEmpty()) {
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
        }

        if(guiContainer != null && guiGraphic != null && this.localPlayer != null) {
            const cursor = this.localPlayer.createEventCursor();
            
            if(game.input.wasPressed(ControlBinding.PRESS_UI) || game.input.touch?.justStartedTouches.length) {
                const gui = guiContainer.gui;
                const graphicId = guiGraphic.graphicId;

                const graphic = gui.graphics.get(graphicId);
                graphic?.type.events.runTrigger("base:ui/press_down", cursor);
            }
        }

        this.chatGui.render(time);
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
        if(this.debugMenu.view.visible) {
            this.debugMenuLines.queues.setData(
                this.world.loadingChunks.size,
                this.chunkLoader.columnLoadQueue.size,
                this.chunkLoader.columnGenerationQueue.size,
                this.worldRenderer.chunkRenderer.dirtyRegions.size,
                this.world.chunksToSave.size,
                this.chunkLoader.regionsToUnload.size
            );

            let drawCalls = 0;
            let individualChunks = 0;
            let batchedChunks = 0;
            
            this.camera.updateMatrixWorld();
            const frustum = new Frustum().setFromProjectionMatrix(
                new Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse),
                this.camera.coordinateSystem
            );
            this.worldRenderer.scene.traverseVisible(object => {
                if(!("material" in object)) return;
                if(object.frustumCulled && !frustum.intersectsObject(object)) return;
                drawCalls++;
            });
            for(const region of this.worldRenderer.chunkRenderer.renderedRegions) {
                if(region.batchedMesh) batchedChunks++;
                else individualChunks++;
            }
            this.debugMenuLines.counters.setData(
                this.worldRenderer.blockBreakParticles.particleCount,
                this.worldRenderer.entityRenderer.entities.size,
                drawCalls,
                individualChunks,
                batchedChunks,
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

        this.persistentWorld = null;

        this.setPaused(true);

        if(!this.game.isDesktop) {
            this.game.input.detachMobileController();
        }
        clearInterval(this.blockTickInterval);

        this.world.dispose();
        this.chatGui.dispose();

        // otherwise hangs on to references to the world and misc. renderers
        EventCursor.setClientPlatform(null);
    }
}