import { Assets, BitmapText, Color, Container, Graphics, NineSliceSprite, Rectangle, Sprite, TextStyle, Texture } from "pixi.js";
import { ScrollBox } from "@pixi/ui";
import type { BoxelGame } from "../../boxel";
import { GuiButton } from "../../gui/button";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";
import z from "zod";
import { WorldCreateStage } from "./worldCreateStage";
import { PlayingGameStage } from "./playingGameStage";
import { MathUtils } from "three";
import "javascript-time-ago/locale/en";
import TimeAgo from "javascript-time-ago";
import { IconButton } from "../../gui/iconButton";

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
    public readonly worldName: BitmapText;
    public readonly lastPlayed: BitmapText;
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

        const textStyle = new TextStyle({
            fill: new Color(0xffffff),
            fontSize: 12
        });
        const worldName = new BitmapText({
            text: world.name,
            style: new TextStyle({
                fill: new Color(0xffffff),
                fontFamily: "BoxelFont",
                fontSize: 12
            })
        });
        worldName.position.set(40, 4);

        const timeFormat = new TimeAgo(navigator.language);
        const lastPlayed = new BitmapText({
            text: world.played == 0 ? "Never played" : timeFormat.format(world.played),
            style: new TextStyle({
                fill: new Color(0xffffff),
                fontFamily: "BoxelFont",
                fontSize: 12
            }),
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
    private readonly titleText: BitmapText;
    private readonly backButton: GuiButton;
    private readonly createWorldButton: GuiButton;
    private readonly background: Sprite;
    private readonly worldsList: ScrollBox;
    private readonly worldsListMask: Sprite;
    private readonly worldsListViewport: Graphics;
    public savedData: SavedWorlds | null = null;

    public constructor(game: BoxelGame) {
        super(game);

        this.worldsList = new ScrollBox({
            width: WorldCard.WIDTH + 16,
            height: 160,
            type: "vertical",
            background: 0x1a1a1a,
            elementsMargin: 8,
            padding: 8,
            globalScroll: false,
            disableDynamicRendering: true
        });
        this.worldsListMask = new Sprite(Texture.WHITE);
        this.worldsListMask.anchor.set(0, 0);
        this.worldsListMask.eventMode = "none";
        this.worldsListMask.alpha = 1;
        this.worldsList.addChild(this.worldsListMask);
        this.worldsList.mask = this.worldsListMask;

        this.worldsListViewport = new Graphics();
        this.worldsListViewport.eventMode = "none";

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.titleText = new BitmapText({
            text: "World Select",
            style: new TextStyle({
                fill: 0xffffff,
                fontFamily: "BoxelFont",
                fontSize: 24,
                align: "center",
            }),
        });
        this.titleText.anchor.set(0.5);

        this.backButton = new GuiButton("Back", 100, 30);
        this.backButton.on("pointerdown", () => {
            this.audioManager.playMenuBack();
            this.game.previousStage();
        });

        this.createWorldButton = new GuiButton("Create World", 100, 30);
        this.createWorldButton.on("pointerdown", () => {
            this.audioManager.playMenuClick();
            this.game.changeStage(new WorldCreateStage(game));
        });

        this.loadWorlds();


        this.gui.addChild(
            this.background, this.titleText,
            this.worldsListViewport,
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
        
        this.worldsList.removeItems();

        if(this.worldsList.list == null) {
            return;
        }

        const sortedWorlds = this.savedData.worlds.toSorted((a, b) => b.played - a.played);
        for(let i = 0; i < sortedWorlds.length; i++) {
            const world: SavedWorld = sortedWorlds[i]!;
            const card = new WorldCard(world);

            this.worldsList.list.addChild(card);

            card.playButton.addListener("pointerdown", () => {
                this.audioManager.playMenuClick();
                this.playWorld(world.id);
            });
            card.editButton.addListener("pointerup", async () => {
                this.audioManager.playMenuClick();
                world.name = prompt("Enter new world name:", world.name) || world.name;
                
                await this.saveWorlds();
                await this.loadWorlds();
            });
            card.deleteButton.addListener("pointerup", async () => {
                this.audioManager.playMenuClick();
                if(confirm("Delete \"" + world.name + "\"? This cannot be undone!\nid: " + world.id)) {
                    this.savedData?.worlds.splice(this.savedData.worlds.indexOf(world), 1);
                
                    await this.saveWorlds();
                    await this.loadWorlds();
                }
            })
        }

        this.worldsList.resize(true);
        this.worldsList.scrollTop();
        this.syncWorldCardRendering();
    }

    private syncWorldCardRendering() {
        const list = this.worldsList.list;
        if(list == null) return;

        // Ensure cards are visible on first frame before any scroll event updates visibility.
        for(const child of list.children) {
            child.visible = true;
            child.renderable = true;
        }
    }

    private async saveWorlds() {
        if(this.game.mainStorage == null) return;

        await this.game.mainStorage.set("worlds", this.savedData);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.titleText.position.set(width / 2, 20);
        this.backButton.position.set(width / 2 - 60, height - 20);
        this.createWorldButton.position.set(width / 2 + 60, height - 20);
        this.background.setSize(width, height);

        const worldsListWidth = WorldCard.WIDTH + 16;
        const worldsListHeight = Math.max(80, height - 120);
        const worldsListX = (width - worldsListWidth) * 0.5;
        const worldsListY = 50;

        this.worldsList.setSize(worldsListWidth, worldsListHeight);
        this.worldsList.position.set(worldsListX, worldsListY);
        this.worldsListMask.position.set(0, 0);
        this.worldsListMask.width = worldsListWidth;
        this.worldsListMask.height = worldsListHeight;

        const list = this.worldsList.list;
        if(list != null) {
            const horizontalPadding = Math.max(8, Math.floor((worldsListWidth - WorldCard.WIDTH) * 0.5));
            list.leftPadding = horizontalPadding;
            list.rightPadding = horizontalPadding;
            list.arrangeChildren();

            // Keep ScrollBox track bounds in sync after manual list layout changes.
            this.worldsList.resize(true);
        }

        this.worldsListViewport.position.set(worldsListX, worldsListY);
        this.worldsListViewport.clear()
            .roundRect(0, 0, worldsListWidth, worldsListHeight, 3)
            .fill(0x1a1a1a)
            .stroke({ color: 0x333333, width: 1 });

        this.syncWorldCardRendering();
    }

    public tick(time: Time): void {
        
    }

    public unload(): void {
        
    }
}