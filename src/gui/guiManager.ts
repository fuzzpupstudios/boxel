import { Container } from "pixi.js";
import { EventCursor } from "../events/eventSheet";
import type { GraphicalInterface } from "../item/inventoryGui";
import { GuiCursor, GuiContainer } from "./inventoryGuiContainer";
import type { TileHologramProvider } from "./tileHologram";
import { Signal } from "typed-signals";
import type { GuiItemSpriteProvider } from "./guiItem";

export class GuiManager {
    public readonly openGuis = new Map<string, GuiContainer>;
    public readonly guiCursor = new GuiCursor;
    public readonly view = new Container;
    public readonly onUpdate = new Signal<() => void>;

    private lastWidth: number = 0;
    private lastHeight: number = 0;
    private lastPixelRatio: number = 0;
    
    public constructor(
        public readonly hologramProvider: TileHologramProvider,
        public readonly itemSpriteProvider: GuiItemSpriteProvider
    ) {}
    
    public isGuiOpen(id: string) {
        return this.openGuis.has(id);
    }
    public closeGui(id: string) {
        const gui = this.openGuis.get(id);
        if(gui == null) return;

        gui.removeFromParent();
        gui.destroy();
        this.openGuis.delete(id);

        this.onUpdate.emit();
    }
    public getTopModal() {
        return this.openGuis.values().filter(gui => gui.graphicalInterface.type.modal).toArray().pop();
    }
    public getOpenModalCount() {
        return this.openGuis.values().reduce((a, gui) => gui.graphicalInterface.type.modal ? a + 1 : a, 0);
    }
    public openGui(gui: GraphicalInterface) {
        const id = gui.type.id;
        const guiContainer = new GuiContainer(gui,
            this.hologramProvider,
            this.itemSpriteProvider,
            this.guiCursor
        );

        if(this.openGuis.has(id)) this.closeGui(id);

        this.openGuis.set(id, guiContainer);

        const size = guiContainer.getSize();
        guiContainer.pivot.set(size.width / 2, size.height / 2);

        this.view.addChild(guiContainer);

        this.resize(this.lastWidth, this.lastHeight, this.lastPixelRatio);
        
        this.onUpdate.emit();

        return guiContainer;
    }

    public resize(width: number, height: number, pixelRatio: number) {
        this.lastWidth = width;
        this.lastHeight = height;
        this.lastPixelRatio = pixelRatio;

        for(const gui of this.openGuis.values()) {
            const type = gui.graphicalInterface.type;

            gui.position.set(
                width * type.anchor[0] + type.offset[0],
                height * type.anchor[1] + type.offset[1]
            );
        }
    }

    public update(cursor: EventCursor) {
        for(const gui of this.openGuis.values()) {
            gui.updateAllGraphics(cursor);
        }
    }
    public getOpenGui(id: string) {
        return this.openGuis.get(id);
    }
}