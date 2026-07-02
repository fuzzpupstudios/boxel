import { Assets, Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { MathUtils, PerspectiveCamera } from "three";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { BoxelGame } from "../../boxel";
import { Player } from "../../entity/player";
import { GuiButton } from "../../gui/button";
import { ControlBinding, GamepadAxis, MouseAxis } from "../../input/input";
import type { PersistentWorld } from "../../persistence/persistentWorld";
import { BlockBreakParticleEngine } from "../../rendering/blockBreakParticleEngine";
import { BlockStateOutline } from "../../rendering/blockStateOutline";
import { WorldRenderer } from "../../rendering/worldRenderer";
import type { Time } from "../../time";
import { ChunkLoader } from "../../world/chunkLoader";
import { SimpleTerrainGenerator } from "../../world/simpleTerrainGenerator";
import { World } from "../../world/world";
import { GameStage } from "../gameStage";
import { SettingsScreenStage } from "./settingsGameStage";
import { TitleScreenStage } from "./titleScreenStage";
import { TileHologram, TileHologramProvider } from "../../gui/tileHologram";

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
        "base:planks[default]",
        "base:planks_slab[half=bottom]",
        "base:planks_slab[half=top]",
        "base:planks_stair[direction=south]",
    ];

    private sprintFlickCooldown = 0;
    private walkForwardCheckSucceeded = false;
    private placeBlockCooldown = 0;
    private destroyBlockCooldown = 0;

    private readonly crosshairSprite: Sprite;

    private readonly pausedContainer: Container;
    private readonly pausedBackground: Sprite;
    private readonly pausedText: Text;
    private readonly resumeButton: GuiButton;
    private readonly settingsButton: GuiButton;
    private readonly quitButton: GuiButton;

    public constructor(game: BoxelGame) {
        super(game);

        this.world = new World;
        this.worldRenderer = new WorldRenderer(this.world, this.game.textureAtlas!);
        this.chunkLoader = new ChunkLoader(this.world);
        this.localPlayer = new Player(this.world);
        this.blockBreakParticles = new BlockBreakParticleEngine(this.world, game.textureAtlas!);

        this.init().then(() => {
            this.worldLoading = false;
            this.setPaused(false);
        });

        const hologramProvider = new TileHologramProvider(game.textureAtlas!);
        this.holdingBlockPreview = new TileHologram(hologramProvider);
        this.holdingBlockPreview.scale.set(16);
        this.gui.addChild(this.holdingBlockPreview);

        this.crosshairSprite = new Sprite(Assets.get("ui/crosshair"));
        this.crosshairSprite.anchor.set(0.5);
        this.crosshairSprite.scale.set(0.5);
        this.gui.addChild(this.crosshairSprite);


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
        this.resumeButton.onPress.connect(() => {
            this.setPaused(false);
        });

        this.settingsButton = new GuiButton("Settings", 100, 30);
        this.settingsButton.onPress.connect(() => {
            this.game.changeStage(new SettingsScreenStage(game));
        });

        this.quitButton = new GuiButton("Save and Quit", 100, 30);
        this.quitButton.onPress.connect(() => {
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
    private async init() {
        this.persistentWorld = this.game.persistenceManager.openWorld("demo");

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
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.camera.aspect = width / height;

        this.holdingBlockPreview.position.set(24, 24);
        this.crosshairSprite.position.set(width / 2, height / 2);

        this.pausedText.position.set(width / 2, 20);
        this.resumeButton.position.set(width / 2, height - 88);
        this.settingsButton.position.set(width / 2, height - 54);
        this.quitButton.position.set(width / 2, height - 20);
        this.pausedBackground.setSize(width, height);
        this.pausedContainer.setSize(width, height);
    }

    public setPaused(paused: boolean) {
        console.log("set paused ", paused);
        this.paused = paused;
        if(paused) {
            this.pausedContainer.visible = true;

            this.game.input.mouse?.unlock();
            this.game.input.keyboard?.unlock();
        } else {
            this.pausedContainer.visible = false;
            
            this.game.input.mouse?.lock();
            this.game.input.keyboard?.lock();
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
        }

        if(!this.paused) {
            let moveDeltaX = (
                game.input.getAnalog(ControlBinding.RIGHT)
                + game.input.getGamepadAxis(GamepadAxis.LEFT_X, game.settings.controllerDeadzone)
                - game.input.getAnalog(ControlBinding.LEFT)
            );
            let moveDeltaZ = (
                game.input.getAnalog(ControlBinding.BACKWARD)
                - game.input.getGamepadAxis(GamepadAxis.LEFT_Y, game.settings.controllerDeadzone)
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

            if(game.input.isPressed(ControlBinding.DESTROY)) {
                this.destroyBlockCooldown -= time.deltaTime;

                if(this.destroyBlockCooldown <= 0) {
                    this.localPlayer.destroy();
                    this.destroyBlockCooldown = 0.2;
                }
            } else {
                this.destroyBlockCooldown = 0;
            }
            if(game.input.isPressed(ControlBinding.USE)) {
                this.placeBlockCooldown -= time.deltaTime;

                if(this.placeBlockCooldown <= 0) {
                    this.localPlayer.place();
                    this.placeBlockCooldown = 0.2;
                }
            } else {
                this.placeBlockCooldown = 0;
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
                    game.input.getGamepadAxis(GamepadAxis.RIGHT_X, game.settings.controllerDeadzone)
                ) * game.settings.controllerSensitivity * 2 +
                game.input.getMouseAxis(MouseAxis.DELTA_X, true) * 0.3 * game.settings.mouseSensitivity
            );
            if(game.settings.invertX) lookDeltaX *= -1;

            let lookDeltaY = (
                (
                    game.input.getAnalog(ControlBinding.ROTATE_UP) -
                    game.input.getAnalog(ControlBinding.ROTATE_DOWN) +
                    game.input.getGamepadAxis(GamepadAxis.RIGHT_Y, game.settings.controllerDeadzone)
                ) * game.settings.controllerSensitivity * 2 -
                game.input.getMouseAxis(MouseAxis.DELTA_Y, true) * 0.3 * game.settings.mouseSensitivity
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
                this.localPlayer.sprinting ? 100 : 90,
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
        this.game.input.keyboard?.unlock();
        this.game.input.mouse?.unlock();
    }
}