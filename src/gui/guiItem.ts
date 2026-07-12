import { Container, Sprite, Texture, TextureSource } from "pixi.js";
import { itemRegistry } from "../item/itemRegistry";
import { blockStateRegistry } from "../block/blockRegistry";

export class GuiItemSpriteProvider {
    private readonly textures = new Map<string, Texture>;

    public constructor() {
        for(const [ itemId, item ] of itemRegistry.entries()) {
            const texture = Texture.from(item.texture);
            this.textures.set(itemId, texture);
        }
        for(const [ blockStateId, blockState ] of blockStateRegistry.entries()) {
            if(blockState.renderAsTexture == null) continue;

            const texture = Texture.from(blockState.renderAsTexture);
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
        console.log(sprite, this._item, this.spriteProvdider);
        if(sprite !== null) {
            this.addChild(sprite);
        }
    }
}