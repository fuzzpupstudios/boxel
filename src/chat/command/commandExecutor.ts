import type { Entity } from "../../entity/entity";
import type { PlayingGameStage } from "../../stage/playing/playingGameStage";
import type { Chat } from "../chat";

export class CommandExecutor {
    public entity: Entity<any> | null = null;

    public constructor(
        public readonly chat: Chat,
        public readonly stage: PlayingGameStage
    ) { }

    public setEntity(entity: Entity) {
        this.entity = entity;
        return this;
    }
}