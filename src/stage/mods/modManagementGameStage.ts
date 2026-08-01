import { ScrollBox } from "@pixi/ui";
import { Assets, Color, Container, NineSliceSprite, Rectangle, Sprite, Texture } from "pixi.js";
import type { BoxelGame } from "../../boxel";
import { AssetPack } from "../../data/assetPack";
import type { ModEntry } from "../../data/modManager";
import { GuiButton } from "../../gui/element/button";
import { IconButton } from "../../gui/element/iconButton";
import { GuiText } from "../../gui/element/text";
import { ControlBinding } from "../../input/input";
import type { Time } from "../../time";
import { GameStage } from "../gameStage";

class ModCard extends Container {
    public static readonly WIDTH = 240;

    public readonly background: NineSliceSprite;
    public readonly assetPackName: GuiText;
    public readonly packIcon: Sprite;
    public readonly packFilename: GuiText;
    public readonly packVersion: GuiText;
    public readonly deleteButton: IconButton;
    public readonly refreshButton: IconButton;

    public constructor(mod: ModEntry) {
        const background = new NineSliceSprite({
            texture: Assets.get("base:ui/button.png"),
            leftWidth: 3,
            topHeight: 3,
            rightWidth: 3,
            bottomHeight: 3,

            width: ModCard.WIDTH,
            height: 40
        });
        background.anchor.set(0.5);

        const packName = new GuiText({
            text: mod.pack?.descriptor.name ?? "Missing"
        });
        packName.position.set(40, 4);

        const packFilename = new GuiText({
            text: mod.filename,
            alpha: 0.5,
            fontScale: 0.75
        });
        packFilename.position.set(40, 22);

        const packVersion = new GuiText({
            text: mod.pack?.descriptor.version ?? "unknown",
            fontScale: 0.75,
            align: "right",
            alpha: 0.5,
            fontStyle: "oblique"
        });
        packVersion.setAnchor(1, 0);
        packVersion.position.set(ModCard.WIDTH - 22, 22);

        if(mod.pack == null) {
            packName.fill = packFilename.fill = packVersion.fill = new Color(0xff8888);
        }

        const assetPackButtonsImage = Assets.get("base:ui/asset_pack_buttons.png");
        const iconSrc = mod.pack?.descriptor.icon ?? "base:ui/pack.png";
        const packIconImage = Assets.get(iconSrc);
        const packIconTexture = packIconImage == null ? Texture.EMPTY : new Texture(packIconImage);

        const packIcon = new Sprite(packIconTexture);
        packIcon.setSize(32, 32);
        packIcon.anchor.set(0.5, 0.5);
        packIcon.position.set(19, 19);

        const deleteButton = new IconButton(new Texture({
            source: assetPackButtonsImage,
            frame: new Rectangle(32, 16, 16, 16)
        }));
        deleteButton.position.set(ModCard.WIDTH - 12, 11);

        const refreshButton = new IconButton(new Texture({
            source: assetPackButtonsImage,
            frame: new Rectangle(32, 0, 16, 16)
        }));
        refreshButton.position.set(ModCard.WIDTH - 12, 27);

        super({
            children: [ background, packIcon, packName, packFilename, packVersion, refreshButton ]
        });

        if(!mod.preinstalled) {
            this.addChild(deleteButton);
        }

        background.position.set(background.width * 0.5, background.height * 0.5);

        this.background = background;
        this.assetPackName = packName;
        this.packIcon = packIcon;
        this.packFilename = packFilename;
        this.packVersion = packVersion;
        this.deleteButton = deleteButton;
        this.refreshButton = refreshButton;
    }
}

export class ModManagementGameStage extends GameStage {
    private readonly screenTitle: GuiText;
    private readonly installButton: GuiButton;
    private readonly backButton: GuiButton;
    private readonly background: Sprite;
    private readonly modsList: ScrollBox;

    public constructor(game: BoxelGame) {
        super(game);

        this.background = new Sprite(Texture.WHITE);
        this.background.origin.set(0, 0);
        this.background.tint = 0x000000;
        this.background.interactive = true;

        this.screenTitle = new GuiText({
            text: "Mods",
            align: "center",
            fontScale: 2
        });
        this.screenTitle.setAnchor(0.5, 0.5);

        this.modsList = new ScrollBox({
            width: ModCard.WIDTH + 16,
            height: 160,
            type: "vertical",
            elementsMargin: 8,
            padding: 8
        });

        this.backButton = new GuiButton("Back", 100, 30);

        this.backButton.on("pointerdown", async () => {
            this.game.audioManager.playMenuBack();
            await this.saveMods();
            await this.game.reloadAssets();
            this.game.previousStage();
        });

        this.installButton = new GuiButton("Install", 100, 30);

        this.installButton.on("pointerdown", async () => {
            this.game.audioManager.playMenuClick();
            const files = await this.promptModFiles(true);
            if(!files) return;

            const packs = await Promise.all(files.map(file => AssetPack.fromBlob(file)));
            
            if(!confirm(
                "Install these " + files.length + " mods?\n+ " +
                packs.map((pack, i) => pack.descriptor.name + " " + pack.descriptor.version + " (" + files[i]?.name + ")").join("\n+ ")
            )) return;

            for(let i = 0; i < packs.length; i++) {
                const file = files[i]!;
                const pack = packs[i]!;
                await this.game.modManager.addModFile(file.name, pack, false);
            }

            await this.saveMods();
            await this.loadMods();
        });

        this.gui.addChild(
            this.background, this.screenTitle,
            this.modsList,
            this.backButton, this.installButton
        );

        this.loadMods();
    }

    private async loadMods() {
        const cards = new Array<ModCard>;

        for(const mod of this.game.modManager.installedMods) {
            const card = new ModCard(mod);

            cards.push(card);
            
            card.refreshButton.addListener("pointerup", async () => {
                this.game.audioManager.playMenuClick();
                const file = await this.promptModFiles(false);
                if(file == null) return;

                await this.game.modManager.updateFile(mod.filename, file.name, file);
                await this.saveMods();
                await this.loadMods();
            });
            card.deleteButton.addListener("pointerup", async () => {
                this.game.audioManager.playMenuClick();
                const name = mod.pack?.descriptor.name ?? mod.filename;
                if(confirm("Delete \"" + name + "\"? This cannot be undone!\nfilename: " + mod.filename)) {
                    await this.game.modManager.deleteMod(mod.filename);
                    await this.saveMods();
                    await this.loadMods();
                }
            });
        }

        this.modsList.removeItems();
        this.modsList.addItems(cards);
        this.modsList.resize(true);
        this.modsList.scrollTop();
    }

    private async saveMods() {
        await this.game.modManager.save();
    }

    private async promptModFiles(multiple: false): Promise<File | undefined>
    private async promptModFiles(multiple: true): Promise<File[] | undefined>
    private async promptModFiles(multiple: boolean): Promise<File[] | File | undefined> {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".zip";
        input.multiple = multiple;
        input.click();

        await new Promise(r => input.addEventListener("change", r));

        const files = Array.from(input.files ?? []);
        if(files.length == 0) {
            alert("No files selected");
            return;
        }
        
        return multiple ? files : files[0];
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        this.screenTitle.position.set(width / 2, 20);
        this.backButton.position.set(width / 2 - 52, height - 20);
        this.installButton.position.set(width / 2 + 52, height - 20);

        this.background.setSize(width, height);

        const listWidth = ModCard.WIDTH + 16;
        const listHeight = Math.max(20, height - 100);

        this.modsList.setSize(listWidth, listHeight);
        this.modsList.position.set((width - listWidth) * 0.5, 50);
    }

    public tick(time: Time): void {
        if(this.game.input.wasPressed(ControlBinding.BACK)) {
            this.game.previousStage();
        }
    }

    public unload(): void {
        
    }
}