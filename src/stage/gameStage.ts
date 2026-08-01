import { Container } from "pixi.js";
import type { Node } from "three/webgpu";
import type { BoxelGame } from "../boxel";
import type { Settings } from "../settings";
import type { Time } from "../time";

export abstract class GameStage {
    public readonly game: BoxelGame;
    public gui = new Container;

    public constructor(game: BoxelGame) {
        this.game = game;
    }

    public getRenderPass(): Node<"vec4"> | undefined {
        return undefined;
    }

    public abstract resize(width: number, height: number, pixelRatio: number): void;
    public abstract tick(time: Time): void;
    public abstract unload(): void;

    public isTopmostStage() {
        return this === this.game.activeStages.at(-1);
    }
    public updateSettings(settings: Settings) {
        
    }
    public reloadAssets() {
        
    }
}