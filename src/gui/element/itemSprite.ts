import { Container, Sprite, Texture } from "pixi.js";
import { blockStateRegistry } from "../../block/blockRegistry";
import type { TextureAtlases } from "../../boxel";
import { itemRegistry } from "../../item/itemRegistry";

export class GuiItemSpriteProvider {
    private readonly textures = new Map<string, Texture>;

    public constructor(atlases: TextureAtlases) {
        for(const [ itemId, item ] of itemRegistry.entries()) {
            const texture = item.texture.createPixiTexture(atlases.item);
            this.textures.set(itemId, texture);
        }
        for(const [ blockStateId, blockState ] of blockStateRegistry.entries()) {
            if(blockState.renderAsTexture == null) continue;

            const texture = blockState.renderAsTexture.createPixiTexture(atlases.item);
            this.textures.set(blockStateId, texture);
        }
    }

    public canRender(item: string) {
        return this.textures.has(item);
    }

    public createItemSprite(item: string) {
        const texture = this.textures.get(item);
        if(texture == null) return null;

        const sprite = new Sprite(texture);
        sprite.setSize(1, 1);
        return sprite;
    }
}

export class GuiItemSprite extends Container {
    private _item: string = "";

    public constructor(
        private readonly spriteProvdider: GuiItemSpriteProvider
    ) {
        super();

        this.on("added", () => {
            if(this.parent != null) this.parent.sortableChildren = true;
        });
    }

    public get item() {
        return this._item;
    }
    public set item(item: string) {
        if(item == this._item) return;

        this._item = item;
        this.update();
    }

    private update() {
        this.removeChildren();

        const sprite = this.spriteProvdider.createItemSprite(this._item);
        if(sprite !== null) {
            this.addChild(sprite);
        }
    }
}