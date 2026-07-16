import { Assets, BitmapText, Container, Sprite, TextStyle, Texture } from "pixi.js";
import { MathUtils, PerspectiveCamera } from "three";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { BoxelGame } from "../../boxel";
import { Player } from "../../entity/player";
import { EventCursor } from "../../events/eventSheet";
import { GuiButton } from "../../gui/button";
import { isGuiGraphicContainer } from "../../gui/data/guiGraphic";
import { GuiItemSpriteProvider } from "../../gui/guiItem";
import { GuiManager } from "../../gui/guiManager";
import { GuiContainer, InventoryEvent, InventorySlotContainer } from "../../gui/inventoryGuiContainer";
import { GuiDPadLeft } from "../../gui/mobile/dPadLeft";
import { GuiDPadRight } from "../../gui/mobile/dPadRight";
import { Topbar } from "../../gui/mobile/topbar";
import { TileHologram, TileHologramProvider } from "../../gui/tileHologram";
import { ControllerAxis } from "../../input/controller";
import { ControlBinding, MouseAxis, TouchAxis } from "../../input/input";
import { MobileController } from "../../input/mobileController";
import { MouseButton } from "../../input/mouse";
import { inventoryGuiTypeRegistry } from "../../item/inventoryGuiTypeRegistry";
import { itemRegistry } from "../../item/itemRegistry";
import { ItemStack } from "../../item/itemStack";
import type { PersistentWorld } from "../../persistence/persistentWorld";
import { BlockBreakParticleEngine } from "../../rendering/blockBreakParticleEngine";
import { BlockStateOutline } from "../../rendering/blockStateOutline";
import { WorldRenderer } from "../../rendering/worldRenderer";
import type { Settings } from "../../settings";
import type { Time } from "../../time";
import { ChunkLoader } from "../../world/chunkLoader";
import { SimpleTerrainGenerator } from "../../world/simpleTerrainGenerator";
import { World } from "../../world/world";
import { GameStage } from "../gameStage";
import { SettingsScreenStage } from "./settings/settingsGameStage";
import { TitleScreenStage } from "./titleScreenStage";
import { GuiItemStack } from "../../gui/guiItemStack";
import { GuiText } from "../../gui/guiText";

export class PlayingGameStage extends GameStage {
    public readonly world: World;
    public readonly worldRenderer: WorldRenderer;
    public readonly targetedBlock = new BlockStateOutline;
    public readonly blockBreakParticles: BlockBreakParticleEngine;
    public readonly holdingBlockPreview: GuiItemStack;
    public readonly chunkLoader: ChunkLoader;
    public readonly guiManager: GuiManager;
    public override camera = new PerspectiveCamera(90);
    
    public readonly localPlayer: Player;
    private persistentWorld: PersistentWorld | null = null;
    private paused: boolean = false;
    private worldLoading: boolean = true;
    private autosaveCooldown: number = 0;

    private sprintFlickCooldown = 0;
    private walkForwardCheckSucceeded = false;
    private flyCheckCooldown = 0;
    private jumpCheckSucceeded = false;
    private placeBlockCooldown = 0;
    private destroyBlockCooldown = 0;
    private touchStationaryTime = 0;
    private touchPlaceEligible = false;
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

    private readonly hologramProvider: TileHologramProvider;
    private readonly itemSpriteProvider: GuiItemSpriteProvider;
    private readonly mobileController: MobileController | null = null;
    private readonly dPadLeft: GuiDPadLeft | null = null;
    private readonly dPadRight: GuiDPadRight | null = null;
    private readonly topbar: Topbar | null = null;

    public constructor(game: BoxelGame) {
        super(game);

        this.world = new World;
        this.worldRenderer = new WorldRenderer(this.world, this.game.textureAtlas!);
        this.chunkLoader = new ChunkLoader(this.world);
        this.localPlayer = new Player(this.world);
        this.blockBreakParticles = new BlockBreakParticleEngine(this.world, game.textureAtlas!, this.worldRenderer.skyColor);

        this.hologramProvider = new TileHologramProvider(game.textureAtlas!);
        this.itemSpriteProvider = new GuiItemSpriteProvider();
        this.guiManager = new GuiManager(this.hologramProvider, this.itemSpriteProvider);
        this.guiManager.onUpdate.connect(() => {
            this.updateInputLocks();
        });
        this.gui.addChild(this.guiManager.view);

        this.holdingBlockPreview = new GuiItemStack(
            ItemStack.empty(),
            this.hologramProvider,
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

        this.pointerGuiStack = new GuiItemStack(this.pointerStack, this.hologramProvider, this.itemSpriteProvider);
        this.gui.addChild(this.pointerGuiStack);
        this.pointerGuiStack.interactive = false;
        this.pointerGuiStack.zIndex = 10;

        this.itemGivePanel = new Container;
        this.itemGivePanel.visible = false;

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
            const button = new GuiItemStack(stack, this.hologramProvider, this.itemSpriteProvider);

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
            this.audioManager.playMenuBack();
            this.setPaused(false);
        });

        this.settingsButton = new GuiButton("Settings", 100, 30);
        this.settingsButton.on("pointerdown", () => {
            this.audioManager.playMenuClick();
            this.game.changeStage(new SettingsScreenStage(game));
        });

        this.quitButton = new GuiButton("Save and Quit", 100, 30);
        this.quitButton.on("pointerdown", () => {
            this.audioManager.playMenuClick();
            this.world.saveWorld().then(() => {
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
            audioManager: this.audioManager,
            blockBreakParticles: this.blockBreakParticles
        });

        this.camera.add(this.audioManager.listener);
    }
    public async openWorld(worldId: string) {
        this.persistentWorld = this.game.persistenceManager.openWorld(worldId);

        this.world.setPersistentWorld(this.persistentWorld);
        this.world.setTerrainGenerator(new SimpleTerrainGenerator());

        this.scene.add(this.worldRenderer.root);
        this.scene.add(this.targetedBlock.mesh);
        this.scene.add(this.blockBreakParticles.mesh);

        await this.world.loadWorld();
        
        const playerSlot = await this.world.loadPlayerSlot("local");
        this.localPlayer.aabb.position.set(...playerSlot.position);
        this.localPlayer.velocity.set(...playerSlot.velocity);
        [ this.localPlayer.yaw, this.localPlayer.pitch ] = playerSlot.rotation;
        if(playerSlot.inventory) this.localPlayer.inventory.deserialize(playerSlot.inventory);


        const inventories = new Map([
            ["player", this.localPlayer.inventory]
        ]);
        const hotbarGuiType = inventoryGuiTypeRegistry.get("base:hotbar");
        if(hotbarGuiType != null) {
            const hotbar = this.guiManager.openGui(hotbarGuiType.createGui(inventories));

            this.hotbarSelection = new Sprite(Assets.get("base:ui/hotbar_selection.png"));
            hotbar.addChild(this.hotbarSelection);
        }

        this.world.addTickable(this.localPlayer);

        this.worldLoading = false;
        this.setPaused(false);
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
    }

    public setPaused(paused: boolean) {
        this.paused = paused;

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
        this.worldRenderer.fogDistance.value = settings.renderDistance - 16;

        if(this.dPadLeft != null) {
            this.dPadLeft.scale.set(settings.dPadScale);
        }
        if(this.dPadRight != null) {
            this.dPadRight.scale.set(settings.dPadScale);
        }
    }

    public tick(time: Time) {
        if(this.worldLoading) return;

        const game = this.game;

        this.autosaveCooldown -= time.deltaTime;

        if(this.autosaveCooldown <= 0) {
            this.world.saveWorld();
            this.world.savePlayerSlot("local", this.localPlayer);

            this.autosaveCooldown = 10;
        }

        if(this.isTopmostStage()) {
            if(game.input.wasPressed(ControlBinding.PAUSE)) {
                if(this.paused) {
                    this.setPaused(false);
                } else {
                    this.setPaused(true);
                    this.world.saveWorld();
                    this.world.savePlayerSlot("local", this.localPlayer);
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

        if(!this.paused) {
            const topModal = this.guiManager.getTopModal();
            if(topModal != null) {
                if(game.input.wasPressed(ControlBinding.CLOSE_MODAL) || game.input.wasPressed(ControlBinding.BACK)) {
                    this.guiManager.closeGui(topModal.graphicalInterface.type.id);
                    this.localPlayer.inventory.addStack(this.pointerStack);
                }
            } else {
                if(game.input.wasPressed(ControlBinding.OPEN_INVENTORY)) {
                    const inventoryType = inventoryGuiTypeRegistry.get("base:player_inventory")!;

                    const inventories = new Map([
                        ["player", this.localPlayer.inventory]
                    ]);
                    const gui = inventoryType.createGui(inventories);
                    this.guiManager.openGui(gui);
                }
            }

            {
                let cursorX = 0, cursorY = 0;
                if(game.input.controllers.size > 0 && game.controllerCrosshair != null) {
                    cursorX = game.controllerCrosshair.crosshairPosition.x * game.settings.guiScale;
                    cursorY = game.controllerCrosshair.crosshairPosition.y * game.settings.guiScale;
                } else if(game.isDesktop) {
                    cursorX = game.input.getMouseAxis(MouseAxis.X);
                    cursorY = game.input.getMouseAxis(MouseAxis.Y);
                } else if(game.input.touch != null) {
                    cursorX = game.input.touch.justEndedTouches.filter(v => v.uiTouch).at(-1)?.x ?? game.input.getTouchAxis(TouchAxis.X, true);
                    cursorY = game.input.touch.justEndedTouches.filter(v => v.uiTouch).at(-1)?.y ?? game.input.getTouchAxis(TouchAxis.Y, true);
                }

                const bounds = game.gui.canvas.getBoundingClientRect();
                const localX = cursorX - bounds.left;
                const localY = cursorY - bounds.top;
                
                const target = game.gui.renderer.events.rootBoundary.hitTest(localX, localY);
                
                let guiContainer: Container | null = target;
                while(guiContainer != null && !(guiContainer instanceof GuiContainer)) guiContainer = guiContainer.parent;

                let slotContainer: Container | null = target;
                while(slotContainer != null && !(slotContainer instanceof InventorySlotContainer)) slotContainer = slotContainer.parent;

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

                    if(swapStack && !inventoryEvent.consumed) {
                        this.guiManager.guiCursor.onSwapStack.emit(inventoryEvent);
                    }
                    if(dropOne && !inventoryEvent.consumed) {
                        this.guiManager.guiCursor.onDropOne.emit(inventoryEvent);
                    }
                    if(splitStack && !inventoryEvent.consumed) {
                        this.guiManager.guiCursor.onSplitStack.emit(inventoryEvent);
                    }
                    if(quickMove && !inventoryEvent.consumed) {
                        this.guiManager.guiCursor.onQuickMove.emit(inventoryEvent);
                    }
                }

                if(guiContainer != null && guiGraphic != null) {
                    const cursor = this.createEventCursor();
                    
                    if(game.input.wasPressed(ControlBinding.PRESS_UI) || game.input.touch?.justStartedTouches.length) {
                        const gui = guiContainer.graphicalInterface;
                        const graphicId = guiGraphic.graphicId;

                        const graphic = gui.graphics.get(graphicId);
                        graphic?.type.events.runTrigger("base:ui/press_down", cursor);
                    }
                }
            }

            this.hotbarSelection?.position.set(
                this.localPlayer.selectedSlot * 23 + 13,
                8
            );

            if(this.guiManager.getOpenModalCount() == 0) {
                let moveDeltaX = (
                    game.input.getAnalog(ControlBinding.RIGHT)
                    + game.input.getControllerAxis(ControllerAxis.LEFT_X)
                    + game.input.getDpadStrafe()
                    - game.input.getAnalog(ControlBinding.LEFT)
                );
                let moveDeltaZ = (
                    game.input.getAnalog(ControlBinding.BACKWARD)
                    + game.input.getControllerAxis(ControllerAxis.LEFT_Y)
                    - game.input.getAnalog(ControlBinding.FORWARD)
                );
                this.localPlayer.walk(moveDeltaX, moveDeltaZ, time);

                if(moveDeltaZ < -0.9) {
                    if(!this.walkForwardCheckSucceeded) {
                        this.walkForwardCheckSucceeded = true;

                        if(this.sprintFlickCooldown > 0 && !this.localPlayer.crouching) {
                            if(!this.localPlayer.sprinting) {
                                this.localPlayer.setSprinting(true);
                            }
                        }
                        this.sprintFlickCooldown = 0.25;
                    }
                } else {
                    this.walkForwardCheckSucceeded = false;
                    if(this.localPlayer.sprinting) {
                        this.localPlayer.setSprinting(false);
                    }
                }
                if(game.input.isPressed(ControlBinding.SPRINT) && !this.localPlayer.crouching) {
                    if(!this.localPlayer.sprinting) {
                        this.localPlayer.setSprinting(true);
                    }
                }

                this.sprintFlickCooldown -= time.deltaTime;

                if(game.input.isPressed(ControlBinding.JUMP)) {
                    this.localPlayer.jump();
                }

                if(game.input.wasPressed(ControlBinding.CROUCH)) {
                    this.localPlayer.setCrouching(true);
                }
                if(game.input.wasUnpressed(ControlBinding.CROUCH)) {
                    this.localPlayer.setCrouching(false);
                }
                if(game.input.wasPressed(ControlBinding.TOGGLE_CROUCH)) {
                    this.localPlayer.setCrouching(!this.localPlayer.crouching);
                }


                {
                    let destroy = game.input.isPressed(ControlBinding.DESTROY);
                    let place = game.input.isPressed(ControlBinding.USE);

                    if(game.input.touch != null) {
                        const touch = game.input.touch;
                        const justEnded = touch.justEndedTouches.at(-1);

                        const firstTouch = game.input.getFirstTouch(false);
                        
                        if(justEnded != null) {
                            if(!justEnded.uiTouch && justEnded.duration < 0.25 && this.touchPlaceEligible) {
                                place = true;
                            }
                        } else if(firstTouch != null) {
                            if(this.touchStationaryTime < 0.25) {
                                if(Math.abs(firstTouch.dx) + Math.abs(firstTouch.dy) > 3) {
                                    this.touchStationaryTime = -0.75;
                                    this.touchPlaceEligible = false;
                                } else {
                                    this.touchStationaryTime += time.deltaTime;
                                }
                            }
                            if(this.touchStationaryTime >= 0.25) {
                                destroy = true;
                            }
                        }
                        
                        if(firstTouch == null) {
                            this.touchStationaryTime = 0;
                            this.touchPlaceEligible = true;
                        }
                    }

                    if(destroy) {
                        this.destroyBlockCooldown -= time.deltaTime;

                        if(this.destroyBlockCooldown <= 0) {
                            this.localPlayer.destroy();
                            this.destroyBlockCooldown = 0.2;
                        }
                    } else {
                        this.destroyBlockCooldown = 0;
                    }
                    if(place) {
                        this.placeBlockCooldown -= time.deltaTime;

                        if(this.placeBlockCooldown <= 0) {
                            const success = this.localPlayer.use();
                            if(success) {
                                this.localPlayer.place();
                            }
                            this.placeBlockCooldown = 0.2;
                        }
                    } else {
                        this.placeBlockCooldown = 0;
                    }
                }

                if(game.input.wasPressed(ControlBinding.PICK_BLOCK)) {
                    if(this.localPlayer.targetedBlock.hit) {
                        const voxelPos = this.localPlayer.targetedBlock.voxel;
                        const blockStateId = this.world.getBlockState(voxelPos.x, voxelPos.y, voxelPos.z);
                        const blockState = blockStateRegistry.get(blockStateId);
                        const pickBlockStateId = blockState?.pickBlockStateId ?? blockStateId;

                        const existingSlot = this.localPlayer.inventory.findItem(pickBlockStateId);
                        const selectedSlot = this.localPlayer.selectedSlot;

                        if(existingSlot >= 0 && existingSlot <= 9) {
                            this.localPlayer.selectedSlot = existingSlot;
                        } else {
                            const stack = existingSlot == -1
                                ? ItemStack.of(pickBlockStateId, 1)
                                : this.localPlayer.inventory.slots[existingSlot]!.stack;
                            this.localPlayer.inventory.slots[selectedSlot]?.stack.swap(stack);
                            const hotbar = this.guiManager.getOpenGui("base:hotbar");
                            hotbar?.updateSlot("player." + selectedSlot);
                        }
                    }
                }

                if(game.input.wasPressed(ControlBinding.SLOT_0)) {
                    this.localPlayer.selectedSlot = 0;
                }
                if(game.input.wasPressed(ControlBinding.SLOT_1)) {
                    this.localPlayer.selectedSlot = 1;
                }
                if(game.input.wasPressed(ControlBinding.SLOT_2)) {
                    this.localPlayer.selectedSlot = 2;
                }
                if(game.input.wasPressed(ControlBinding.SLOT_3)) {
                    this.localPlayer.selectedSlot = 3;
                }
                if(game.input.wasPressed(ControlBinding.SLOT_4)) {
                    this.localPlayer.selectedSlot = 4;
                }
                if(game.input.wasPressed(ControlBinding.SLOT_5)) {
                    this.localPlayer.selectedSlot = 5;
                }
                if(game.input.wasPressed(ControlBinding.SLOT_6)) {
                    this.localPlayer.selectedSlot = 6;
                }
                if(game.input.wasPressed(ControlBinding.SLOT_7)) {
                    this.localPlayer.selectedSlot = 7;
                }
                if(game.input.wasPressed(ControlBinding.SLOT_8)) {
                    this.localPlayer.selectedSlot = 8;
                }
                if(game.input.wasPressed(ControlBinding.SLOT_9)) {
                    this.localPlayer.selectedSlot = 9;
                }

                let lookDeltaX = (
                    (
                        game.input.getAnalog(ControlBinding.ROTATE_CW) -
                        game.input.getAnalog(ControlBinding.ROTATE_CCW) +
                        game.input.getControllerAxis(ControllerAxis.RIGHT_X)
                    ) * game.settings.controllerSensitivity * 2 * time.deltaTime +
                    (
                        game.input.getMouseAxis(MouseAxis.DELTA_X, true) * 0.003 +
                        game.input.getTouchAxis(TouchAxis.DELTA_X, false) * 0.01
                    ) * game.settings.mouseSensitivity
                );
                if(game.settings.invertX) lookDeltaX *= -1;

                let lookDeltaY = (
                    (
                        game.input.getAnalog(ControlBinding.ROTATE_UP) -
                        game.input.getAnalog(ControlBinding.ROTATE_DOWN) -
                        game.input.getControllerAxis(ControllerAxis.RIGHT_Y)
                    ) * game.settings.controllerSensitivity * 2 * time.deltaTime -
                    (
                        game.input.getMouseAxis(MouseAxis.DELTA_Y, true) * 0.003 +
                        game.input.getTouchAxis(TouchAxis.DELTA_Y, false) * 0.01
                    ) * game.settings.mouseSensitivity
                );
                if(game.settings.invertY) lookDeltaY *= -1;

                this.localPlayer.rotate(lookDeltaX, lookDeltaY);

                if(
                    this.localPlayer.targetedBlock.hit &&
                    this.localPlayer.targetedBlock.distance < this.localPlayer.reachDistance
                ) {
                    this.targetedBlock.mesh.visible = true;
                    this.targetedBlock.mesh.position.copy(this.localPlayer.targetedBlock.voxel)
                    const stateKey = this.world.getBlockState(
                        this.localPlayer.targetedBlock.voxel.x,
                        this.localPlayer.targetedBlock.voxel.y,
                        this.localPlayer.targetedBlock.voxel.z
                    );
                    this.targetedBlock.setBlockState(blockStateRegistry.get(stateKey)!);
                } else {
                    this.targetedBlock.mesh.visible = false;
                }

                if(game.input.wasPressed(ControlBinding.NEXT_ITEM)) {
                    this.localPlayer.selectedSlot++;
                    if(this.localPlayer.selectedSlot > 9) this.localPlayer.selectedSlot = 0;
                }
                if(game.input.wasPressed(ControlBinding.PREVIOUS_ITEM)) {
                    this.localPlayer.selectedSlot--;
                    if(this.localPlayer.selectedSlot < 0) this.localPlayer.selectedSlot = 9;
                }

                this.holdingBlockPreview.setItemStack(
                    this.localPlayer.inventory.slots[this.localPlayer.selectedSlot]!.stack);
            }

            this.world.tick(time);
            this.chunkLoader.moveOrigin(this.localPlayer.aabb.position);
            this.chunkLoader.update(time);

            this.camera.fov = MathUtils.lerp(
                this.camera.fov,
                game.settings.fov + (this.localPlayer.sprinting ? 10 : 0),
                1 - 0.5 ** (time.deltaTime * 20)
            );
            this.camera.position.set(
                this.localPlayer.aabb.position.x,
                this.localPlayer.aabb.position.y + this.localPlayer.eyeHeight,
                this.localPlayer.aabb.position.z
            );
            this.camera.rotation.set(this.localPlayer.pitch, -this.localPlayer.yaw, 0, "YZX");
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


        this.guiManager.update(this.createEventCursor());

        this.camera.updateProjectionMatrix();
        this.worldRenderer.render(time);
        this.blockBreakParticles.tick(time);
    }

    public createEventCursor() {
        const cursor = new EventCursor(
            this.world,
            Math.floor(this.localPlayer.aabb.position.x),
            Math.floor(this.localPlayer.aabb.position.y),
            Math.floor(this.localPlayer.aabb.position.z)
        );
        cursor.entity = this.localPlayer;

        return cursor;
    }

    public unload(): void {
        if(this.persistentWorld != null) {
            this.game.persistenceManager.closeWorld(this.persistentWorld);
        }

        this.setPaused(true);

        if(!this.game.isDesktop) {
            this.game.input.detachMobileController();
        }
    }
}