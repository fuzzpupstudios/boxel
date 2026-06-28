import { PerspectiveCamera, type OrthographicCamera } from "three";
import type { TextureAtlas } from "../../assets/textureAtlas";
import { Player } from "../../entity/player";
import { BlockStateOutline } from "../../rendering/blockStateOutline";
import { WorldRenderer } from "../../rendering/worldRenderer";
import { ChunkLoader } from "../../world/chunkLoader";
import { World } from "../../world/world";
import { GameStage } from "../gameStage";
import { SimpleTerrainGenerator } from "../../world/simpleTerrainGenerator";
import type { Time } from "../../time";
import { ControlBinding } from "../../input/input";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { BoxelGame } from "../../boxel";

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
        
        this.player.walk(
            game.input.getAnalog(ControlBinding.RIGHT) - game.input.getAnalog(ControlBinding.LEFT),
            game.input.getAnalog(ControlBinding.BACKWARD) - game.input.getAnalog(ControlBinding.FORWARD),
            time
        );

        if(game.input.isPressed(ControlBinding.JUMP)) {
            this.player.jump();
        }

        if(game.input.wasPressed(ControlBinding.DESTROY)) {
            this.player.destroy();
        }
        if(game.input.wasPressed(ControlBinding.USE)) {
            this.player.place();
        }

        this.player.rotate(
            (game.input.getAnalog(ControlBinding.ROTATE_CW) - game.input.getAnalog(ControlBinding.ROTATE_CCW)) * time.deltaTime * 2,
            (game.input.getAnalog(ControlBinding.ROTATE_UP) - game.input.getAnalog(ControlBinding.ROTATE_DOWN)) * time.deltaTime * 2,
        );

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

        this.camera.position.set(
            this.player.aabb.position.x,
            this.player.aabb.position.y + this.player.eyeHeight,
            this.player.aabb.position.z
        );
        this.camera.rotation.set(this.player.pitch, -this.player.yaw, 0, "YZX");

        game.input.update();
        this.worldRenderer.render(time);
    }
}