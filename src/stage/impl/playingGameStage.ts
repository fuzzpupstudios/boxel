import { PerspectiveCamera } from "three";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { BoxelGame } from "../../boxel";
import { Player } from "../../entity/player";
import { ControlBinding } from "../../input/input";
import { BlockStateOutline } from "../../rendering/blockStateOutline";
import { WorldRenderer } from "../../rendering/worldRenderer";
import type { Time } from "../../time";
import { ChunkLoader } from "../../world/chunkLoader";
import { SimpleTerrainGenerator } from "../../world/simpleTerrainGenerator";
import { World } from "../../world/world";
import { GameStage } from "../gameStage";

export class PlayingGameStage extends GameStage {
    public readonly world: World;
    public readonly worldRenderer: WorldRenderer;
    public readonly targetedBlock = new BlockStateOutline;
    public readonly chunkLoader: ChunkLoader;
    public override camera = new PerspectiveCamera(90);
    
    public readonly player: Player;

    public constructor(game: BoxelGame) {
        super(game);

        this.world = new World;
        this.world.setTerrainGenerator(new SimpleTerrainGenerator());
        this.worldRenderer = new WorldRenderer(this.world, this.game.textureAtlas!);
        this.chunkLoader = new ChunkLoader(this.world);

        this.player = new Player(this.world);

        this.scene.add(this.worldRenderer.root);
        this.scene.add(this.targetedBlock.mesh);

        this.player.aabb.position.set(32, 128, 32);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

    }

    public tick(time: Time) {
        const game = this.game;
        
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
            this.player.walk(moveDeltaX, moveDeltaZ, time);

        if(game.input.isPressed(ControlBinding.JUMP)) {
            this.player.jump();
        }

        if(game.input.wasPressed(ControlBinding.DESTROY)) {
            this.player.destroy();
        }
        if(game.input.wasPressed(ControlBinding.USE)) {
            this.player.place();
        }

            let lookDeltaX = (
                game.input.getAnalog(ControlBinding.ROTATE_CW) -
                game.input.getAnalog(ControlBinding.ROTATE_CCW) +
                game.input.getGamepadAxis(GamepadAxis.RIGHT_X,
                    game.settings.controllerDeadzone) * game.settings.controllerSensitivity * 2 +
                game.input.getMouseAxis(MouseAxis.DELTA_X, true) * 0.3 * game.settings.mouseSensitivity
            );
            if(game.settings.invertX) lookDeltaX *= -1;

            let lookDeltaY = (
                game.input.getAnalog(ControlBinding.ROTATE_UP) -
                game.input.getAnalog(ControlBinding.ROTATE_DOWN) +
                game.input.getGamepadAxis(GamepadAxis.RIGHT_Y,
                    game.settings.controllerDeadzone) * game.settings.controllerSensitivity * 2 -
                game.input.getMouseAxis(MouseAxis.DELTA_Y, true) * 0.3 * game.settings.mouseSensitivity
            );
            if(game.settings.invertY) lookDeltaY *= -1;

            this.player.rotate(lookDeltaX * time.deltaTime, lookDeltaY * time.deltaTime);

        this.player.tick(time);
        this.chunkLoader.moveOrigin(this.player.aabb.position);
        this.chunkLoader.update(time);

        if(this.player.targetedBlock.hit) {
            this.targetedBlock.mesh.visible = true;
            this.targetedBlock.mesh.position.copy(this.player.targetedBlock.voxel)
            const stateKey = this.world.getBlockStateKey(
                this.player.targetedBlock.voxel.x,
                this.player.targetedBlock.voxel.y,
                this.player.targetedBlock.voxel.z
            );
            this.targetedBlock.setBlockState(blockStateRegistry.get(stateKey)!);
        } else {
            this.targetedBlock.mesh.visible = false;
            }
        }

        this.camera.position.set(
            this.player.aabb.position.x,
            this.player.aabb.position.y + this.player.eyeHeight,
            this.player.aabb.position.z
        );
        this.camera.rotation.set(this.player.pitch, -this.player.yaw, 0, "YZX");

        this.worldRenderer.render(time);
    }
}