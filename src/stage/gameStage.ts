import { Camera, OrthographicCamera, Scene } from "three";
import type { BoxelGame } from "../boxel";
import type { Time } from "../time";
import { Container } from "pixi.js";
import type { Settings } from "../settings";
import { AudioManager } from "../textures/audioManager";

export abstract class GameStage {
    public readonly game: BoxelGame;
    public readonly audioManager: AudioManager;
    public scene: Scene = new Scene;
    public camera: Camera = new OrthographicCamera;
    public gui = new Container;

    public constructor(game: BoxelGame) {
        this.game = game;
        this.audioManager = new AudioManager(this.game.assets);
        this.scene.add(this.audioManager.listener);
    }

    public abstract resize(width: number, height: number, pixelRatio: number): void;
    public abstract tick(time: Time): void;
    public abstract unload(): void;

    public isTopmostStage() {
        return this === this.game.activeStages.at(-1);
    }
    public updateSettings(settings: Settings) {
        
    }
}