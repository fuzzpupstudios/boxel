import { Color, Container, Sprite, Texture } from "pixi.js";
import type { ItemStack } from "../../item/itemStack";
import { GuiItemSprite, type GuiItemSpriteProvider } from "./itemSprite";
import { GuiText } from "./text";
import { TileHologram, type TileHologramProvider } from "./tileHologram";
import { MathUtils } from "three";

export class GuiItemStack extends Container {
    public readonly tileHologram: TileHologram;
    public readonly itemSprite: GuiItemSprite;
    public readonly counter: GuiText;
    public readonly durability: Sprite;

    public constructor(
        public stack: ItemStack,
        private readonly hologramProvider: TileHologramProvider,
        private readonly itemSpriteProvider: GuiItemSpriteProvider
    ) {
        const tileHologram = new TileHologram(hologramProvider);
        tileHologram.scale.set(14);
        tileHologram.position.set(1, 1);

        const itemSprite = new GuiItemSprite(itemSpriteProvider);
        itemSprite.scale.set(14);
        itemSprite.position.set(1, 1);

        const durability = new Sprite(Texture.WHITE);
        durability.pivot.set(0, 0);
        durability.position.set(1, 14);

        const counter = new GuiText({
            text: "",
            fill: new Color(0xffffff),
            fontScale: 2/3,
            align: "right"
        });
        counter.setAnchor(1);
        counter.position.set(16, 16);

        super({
            children: [ counter ],
            pivot: { x: 8, y: 8 }
        });

        this.tileHologram = tileHologram;
        this.itemSprite = itemSprite;
        this.counter = counter;
        this.durability = durability;

        this.updateDisplayItem();
    }

    public updateDisplayItem() {
        if(this.stack.isEmpty()) {
            this.visible = false;
            return;
        } else {
            this.visible = true;
        }

        const renderAsItem = this.itemSpriteProvider.canRender(this.stack.item);

        if(renderAsItem) {
            this.itemSprite.item = this.stack.item;
            this.removeChildren();
            this.addChild(this.itemSprite);
            this.addChild(this.counter);
        } else {
            this.tileHologram.blockStateId = this.stack.item;
            this.removeChildren();
            this.addChild(this.tileHologram);
            this.addChild(this.counter);
        }

        if(this.stack.data) {
            if("durability" in this.stack.data) {
                const durability = this.stack.data.durability;
                const max_durability = this.stack.data.max_durability ?? 64;

                const filled = MathUtils.clamp(durability / max_durability, 0, 1);
                this.durability.width = 14 * filled;

                if(filled < 1) {
                    this.addChild(this.durability);
                } else {
                    this.removeChild(this.durability);
                }

                this.durability.tint = "hsl(" + MathUtils.mapLinear(filled, 0, 1, 0, 120) + ", 100%, 50%)";
            }
        }

        if(this.stack.quantity > 1) {
            let amount = this.stack.quantity;
            let suffix = "";
            if(amount >= 1000) {
                amount = Math.floor(amount / 100) / 10;
                suffix = "K";
            }
            if(amount >= 1000) {
                amount = Math.floor(amount / 100) / 10;
                suffix = "M";
            }
            this.counter.text = amount + suffix;
            this.counter.visible = true;
        } else {
            this.counter.visible = false;
        }
    }
}