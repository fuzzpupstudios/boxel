import { ScrollBox } from "@pixi/ui";
import TimeAgo from "javascript-time-ago";
import "javascript-time-ago/locale/en";
import { Assets, Container, NineSliceSprite, Rectangle, Sprite, Texture } from "pixi.js";
import z from "zod";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/element/button";
import { IconButton } from "../../gui/element/iconButton";
import { GuiText } from "../../gui/element/text";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";
import { PlayingGameStage } from "../playing/playingGameStage";
import { WorldCreateStage } from "./worldCreateStage";

type SavedWorld = z.infer<typeof SavedWorld>;
const SavedWorld = z.object({
    name: z.string().default("World"),
    created: z.number().default(0),
    played: z.number().default(0),
    id: z.string()
});

type SavedWorlds = z.infer<typeof SavedWorlds>;
const SavedWorlds = z.object({
    worlds: z.array(SavedWorld).default([])
})

class WorldCard extends Container {
    public static readonly WIDTH = 240;

    public readonly background: NineSliceSprite;
    public readonly worldName: GuiText;
    public readonly lastPlayed: GuiText;
    public readonly playButton: IconButton;
    public readonly deleteButton: IconButton;
    public readonly editButton: IconButton;

    public constructor(world: SavedWorld) {
        const background = new NineSliceSprite({
            texture: Assets.get("base:ui/button.png"),
            leftWidth: 3,
            topHeight: 3,
            rightWidth: 3,
            bottomHeight: 3,

            width: WorldCard.WIDTH,
            height: 40
        });
        background.anchor.set(0.5);

        const worldName = new GuiText({
            text: world.name
        });
        worldName.position.set(40, 4);

        const timeFormat = new TimeAgo(navigator.language);
        const lastPlayed = new GuiText({
            text: world.played == 0 ? "Never played" : timeFormat.format(world.played),
            alpha: 0.5
        });
        lastPlayed.position.set(40, 18);

        const worldButtonsImage = Assets.get("base:ui/world_buttons.png");
        const playButton = new IconButton(new Texture({
            source: worldButtonsImage,
            frame: new Rectangle(0, 0, 32, 32)
        }));
        playButton.position.set(19, 19);

        const deleteButton = new IconButton(new Texture({
            source: worldButtonsImage,
            frame: new Rectangle(32, 16, 16, 16)
        }));
        deleteButton.position.set(WorldCard.WIDTH - 12, 11);

        const editButton = new IconButton(new Texture({
            source: worldButtonsImage,
            frame: new Rectangle(32, 0, 16, 16)
        }));
        editButton.position.set(WorldCard.WIDTH - 12, 27);

        super({
            children: [ background, worldName, lastPlayed, playButton, deleteButton, editButton ]
        });

        background.position.set(background.width * 0.5, background.height * 0.5);

        this.background = background;
        this.worldName = worldName;
        this.lastPlayed = lastPlayed;
        this.playButton = playButton;
        this.deleteButton = deleteButton;
        this.editButton = editButton;
    }
}

export class WorldSelectStage extends GameStage {
    private readonly titleText: GuiText;
    private readonly backButton: GuiButton;
    private readonly createWorldButton: GuiButton;
    private readonly background: Sprite;
    private readonly worldsList: ScrollBox;
    public savedData: SavedWorlds | null = null;

    public constructor(game: BoxelGame) {
        super(game);

        this.worldsList = new ScrollBox({
            width: WorldCard.WIDTH + 16,
            height: 160,
            type: "vertical",
            elementsMargin: 8,
            padding: 8
        });

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.titleText = new GuiText({
            text: "World Select",
            fontScale: 2,
            align: "center"
        });
        this.titleText.setAnchor(0.5);

        this.backButton = new GuiButton("Back", 100, 30);
        this.backButton.on("pointerdown", () => {
            this.game.audioManager.playMenuBack();
            this.game.previousStage();
        });

        this.createWorldButton = new GuiButton("Create World", 100, 30);
        this.createWorldButton.on("pointerdown", () => {
            this.game.audioManager.playMenuClick();
            this.game.changeStage(new WorldCreateStage(game));
        });

        this.loadWorlds();


        this.gui.addChild(
            this.background, this.titleText,
            this.worldsList,
            this.backButton, this.createWorldButton
        );
    }

    public async createWorld(options: {
        name: string
    }) {
        if(this.savedData == null) return;

        const idBase = options.name.toLowerCase().replace(/[^a-zA-Z0-9\_\-]/g, "_");
        let id = idBase;
        
        let i = 1;
        while(this.savedData.worlds.some(world => world.id == id)) {
            id = idBase + "_" + i;
            i++;
        }

        this.savedData.worlds.push({
            id, name: options.name,
            created: Date.now(),
            played: 0
        });

        await this.saveWorlds();

        return id;
    }

    public async playWorld(id: string) {
        if(this.savedData == null) return;

        const world = this.savedData.worlds.find(world => world.id == id);
        if(world == null) return;

        world.played = Date.now();
        await this.saveWorlds();

        const playingStage = new PlayingGameStage(this.game);
        this.game.changeStage(playingStage, false);
        await playingStage.openWorld(id);
    }

    private async loadWorlds() {
        if(this.game.mainStorage == null) return;

        const savedData: SavedWorlds = await this.game.mainStorage.get("worlds");
        if(savedData == null) {
            const databaseInfo = await indexedDB.databases()

            const worlds = new Array<SavedWorld>;

            for(const db of databaseInfo) {
                if(db.name == null) continue;
                if(!db.name.startsWith("world$")) continue;

                const worldId = db.name.replace("world$", "");

                worlds.push({
                    created: performance.now(),
                    played: 0,
                    id: worldId,
                    name: worldId == "demo" ? "World" : worldId
                });
            }

            this.savedData = { worlds };
            await this.saveWorlds();
        } else {
            this.savedData = SavedWorlds.parse(savedData ?? {});
        }

        const cards = new Array<WorldCard>;

        const sortedWorlds = this.savedData.worlds.toSorted((a, b) => b.played - a.played);
        for(let i = 0; i < sortedWorlds.length; i++) {
            const world: SavedWorld = sortedWorlds[i]!;
            const card = new WorldCard(world);

            cards.push(card);

            card.playButton.addListener("pointerdown", () => {
                this.game.audioManager.playMenuClick();
                this.playWorld(world.id);
            });
            card.editButton.addListener("pointerup", async () => {
                this.game.audioManager.playMenuClick();
                world.name = prompt("Enter new world name:", world.name) || world.name;
                
                await this.saveWorlds();
                await this.loadWorlds();
            });
            card.deleteButton.addListener("pointerup", async () => {
                this.game.audioManager.playMenuClick();
                if(confirm("Delete \"" + world.name + "\"? This cannot be undone!\nid: " + world.id)) {
                    this.savedData?.worlds.splice(this.savedData.worlds.indexOf(world), 1);
                
                    await this.saveWorlds();
                    await this.loadWorlds();
                }
            })
        }

        this.worldsList.removeItems();
        this.worldsList.addItems(cards);
        this.worldsList.resize(true);
        this.worldsList.scrollTop();
    }

    private async saveWorlds() {
        if(this.game.mainStorage == null) return;

        await this.game.mainStorage.set("worlds", this.savedData);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2 - 52, height - 20);
        this.createWorldButton.position.set(width / 2 + 52, height - 20);
        this.background.setSize(width, height);

        const listWidth = WorldCard.WIDTH + 16;
        const listHeight = Math.max(20, height - 100);

        this.worldsList.setSize(listWidth, listHeight);
        this.worldsList.position.set((width - listWidth) * 0.5, 50);
    }

    public tick(time: Time): void {
        
    }

    public unload(): void {
        
    }
}