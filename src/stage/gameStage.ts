import { Camera, OrthographicCamera, Scene } from "three";
import type { BoxelGame } from "../boxel";
import type { Time } from "../time";

export abstract class GameStage {
    public scene: Scene = new Scene;
    public camera: Camera = new OrthographicCamera;
    public readonly game: BoxelGame;

    public constructor(game: BoxelGame) {
        this.game = game;
    }

    public abstract resize(width: number, height: number, pixelRatio: number): void;
    public abstract tick(time: Time): void;
}