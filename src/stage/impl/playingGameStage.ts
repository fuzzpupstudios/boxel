import { Assets, Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { MathUtils, PerspectiveCamera } from "three";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { BoxelGame } from "../../boxel";
import { Player } from "../../entity/player";
import { GuiButton } from "../../gui/button";
import { ControlBinding, MouseAxis, TouchAxis } from "../../input/input";
import type { PersistentWorld } from "../../persistence/persistentWorld";
import { BlockBreakParticleEngine } from "../../rendering/blockBreakParticleEngine";
import { BlockStateOutline } from "../../rendering/blockStateOutline";
import { WorldRenderer } from "../../rendering/worldRenderer";
import type { Time } from "../../time";
import { ChunkLoader } from "../../world/chunkLoader";
import { SimpleTerrainGenerator } from "../../world/simpleTerrainGenerator";
import { World } from "../../world/world";
import { GameStage } from "../gameStage";
import { SettingsScreenStage } from "./settings/settingsGameStage";
import { TitleScreenStage } from "./titleScreenStage";
import { TileHologram, TileHologramProvider } from "../../gui/tileHologram";
import { GuiDPadLeft } from "../../gui/mobile/dPadLeft";
import type { Settings } from "../../settings";
import { MobileController } from "../../input/mobileController";
import { GuiDPadRight } from "../../gui/mobile/dPadRight";
import { Topbar } from "../../gui/mobile/topbar";
import { ControllerAxis } from "../../input/controller";

export class PlayingGameStage extends GameStage {
    public readonly world: World;
    public readonly worldRenderer: WorldRenderer;
    public readonly targetedBlock = new BlockStateOutline;
    public readonly blockBreakParticles: BlockBreakParticleEngine;
    public readonly holdingBlockPreview: TileHologram;
    public readonly chunkLoader: ChunkLoader;
    public override camera = new PerspectiveCamera(90);
    
    public readonly localPlayer: Player;
    private persistentWorld: PersistentWorld | null = null;
    private paused: boolean = false;
    private worldLoading: boolean = true;
    private autosaveCooldown: number = 0;
    private selectableItems = [
        "base:cobblestone[default]",
        "base:cobblestone_slab[half=bottom]",
        "base:cobblestone_slab[half=top]",
        "base:cobblestone_stair[direction=south]",
        "base:grass[default]",
        "base:dirt[default]",
        "base:lamp[color=white]",
        "base:lamp[color=red]",
        "base:lamp[color=green]",
        "base:lamp[color=blue]",
        "base:planks[default]",
        "base:planks_slab[half=bottom]",
        "base:planks_slab[half=top]",
        "base:planks_stair[direction=south]",
        "base:bricks[default]",
        "base:bricks_slab[half=bottom]",
        "base:bricks_slab[half=top]",
        "base:bricks_stair[direction=south]",
    ];

    private sprintFlickCooldown = 0;
    private walkForwardCheckSucceeded = false;
    private flyCheckCooldown = 0;
    private jumpCheckSucceeded = false;
    private placeBlockCooldown = 0;
    private destroyBlockCooldown = 0;
    private touchStationaryTime = 0;
    private touchPlaceEligible = false;

    private readonly crosshairSprite: Sprite;

    private readonly pausedContainer: Container;
    private readonly pausedBackground: Sprite;
    private readonly pausedText: Text;
    private readonly resumeButton: GuiButton;
    private readonly settingsButton: GuiButton;
    private readonly quitButton: GuiButton;

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

        const hologramProvider = new TileHologramProvider(game.textureAtlas!);
        this.holdingBlockPreview = new TileHologram(hologramProvider);
        this.holdingBlockPreview.scale.set(16);
        this.gui.addChild(this.holdingBlockPreview);

        this.crosshairSprite = new Sprite(Assets.get("ui/crosshair"));
        this.crosshairSprite.anchor.set(0.5);
        this.crosshairSprite.scale.set(0.5);
        this.gui.addChild(this.crosshairSprite);

        
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

        this.pausedText = new Text({
            text: "Paused",
            style: new TextStyle({
                fill: 0xffffff,
                fontSize: 24,
                align: "center",
            }),
        });
        this.pausedText.anchor.set(0.5);

        this.resumeButton = new GuiButton("Resume", 100, 30);
        this.resumeButton.on("pointerdown", () => {
            this.setPaused(false);
        });

        this.settingsButton = new GuiButton("Settings", 100, 30);
        this.settingsButton.on("pointerdown", () => {
            this.game.changeStage(new SettingsScreenStage(game));
        });

        this.quitButton = new GuiButton("Save and Quit", 100, 30);
        this.quitButton.on("pointerdown", () => {
            this.game.changeStage(new TitleScreenStage(game), false);
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

        this.world.addTickable(this.localPlayer);

        this.worldLoading = false;
        this.setPaused(false);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.camera.aspect = width / height;

        this.holdingBlockPreview.position.set(24, 24);
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
    }

    public setPaused(paused: boolean) {
        this.paused = paused;
        requestAnimationFrame(() => {
            if(paused) {
                this.pausedContainer.visible = true;

                if(this.game.isDesktop) {
                    this.game.input.mouse?.unlock();
                    this.game.input.keyboard?.unlock();
                }
                if(this.game.controllerCrosshair != null) {
                    this.game.controllerCrosshair.crosshairPosition
                        .set(this.game.guiWidth / 2, this.game.guiHeight / 2);
                    this.game.controllerCrosshair.enable();
                }
            } else {
                this.pausedContainer.visible = false;
                
                if(this.game.isDesktop) {
                    this.game.input.mouse?.lock();
                    this.game.input.keyboard?.lock();
                }
                this.game.controllerCrosshair?.disable();
            }
        })
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
            }
            if(game.input.wasPressed(ControlBinding.BACK) && this.paused) {
                this.setPaused(false);
            }
        }

        if(!this.paused) {
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

                    if(touch.justStartedTouches.length) {
                        this.touchStationaryTime = 0;
                        this.touchPlaceEligible = true;
                    }

                    if(justEnded != null) {
                        if(justEnded.duration < 0.25 && this.touchPlaceEligible) {
                            place = true;
                        }
                    } else {
                        if(this.touchStationaryTime < 0.25) {
                            if(Math.abs(touch.dx) + Math.abs(touch.dy) > 3) {
                                this.touchStationaryTime = -0.75;
                                this.touchPlaceEligible = false;
                            } else {
                                this.touchStationaryTime += time.deltaTime;
                            }
                        }
                        if(touch.touching && this.touchStationaryTime >= 0.25) {
                            destroy = true;
                        }
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
                        this.localPlayer.place();
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
                    this.localPlayer.holdingBlock = blockStateId;
                }
            }

            let lookDeltaX = (
                (
                    game.input.getAnalog(ControlBinding.ROTATE_CW) -
                    game.input.getAnalog(ControlBinding.ROTATE_CCW) +
                    game.input.getControllerAxis(ControllerAxis.RIGHT_X)
                ) * game.settings.controllerSensitivity * 2 +
                (
                    game.input.getMouseAxis(MouseAxis.DELTA_X, true) * 0.3 +
                    game.input.getTouchAxis(TouchAxis.DELTA_X)
                ) * game.settings.mouseSensitivity
            );
            if(game.settings.invertX) lookDeltaX *= -1;

            let lookDeltaY = (
                (
                    game.input.getAnalog(ControlBinding.ROTATE_UP) -
                    game.input.getAnalog(ControlBinding.ROTATE_DOWN) -
                    game.input.getControllerAxis(ControllerAxis.RIGHT_Y)
                ) * game.settings.controllerSensitivity * 2 -
                (
                    game.input.getMouseAxis(MouseAxis.DELTA_Y, true) * 0.3 +
                    game.input.getTouchAxis(TouchAxis.DELTA_Y)
                ) * game.settings.mouseSensitivity
            );
            if(game.settings.invertY) lookDeltaY *= -1;

            this.localPlayer.rotate(lookDeltaX * time.deltaTime, lookDeltaY * time.deltaTime);

            this.world.tick(time);
            this.chunkLoader.moveOrigin(this.localPlayer.aabb.position);
            this.chunkLoader.update(time);

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

            let selectedItemIndex = this.selectableItems.indexOf(this.localPlayer.holdingBlock);
            if(game.input.wasPressed(ControlBinding.NEXT_ITEM)) {
                selectedItemIndex++;
                this.localPlayer.holdingBlock = this.selectableItems[Math.min(this.selectableItems.length - 1, selectedItemIndex)]!;
            }
            if(game.input.wasPressed(ControlBinding.PREVIOUS_ITEM)) {
                selectedItemIndex--;
                this.localPlayer.holdingBlock = this.selectableItems[Math.max(0, selectedItemIndex)]!;
            }

            this.holdingBlockPreview.blockStateId = this.localPlayer.holdingBlock;

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

        this.camera.updateProjectionMatrix();
        this.worldRenderer.render(time);
        this.blockBreakParticles.tick(time);
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