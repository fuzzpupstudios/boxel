import { Container } from "pixi.js";
import { Signal } from "typed-signals";
import { EventCursor } from "../events/eventSheet";
import type { PointerLock } from "../input/pointerLock";
import { EventError } from "../utilTypes";
import { GuiContainer } from "./element/guiContainer";
import type { GuiItemSpriteProvider } from "./element/itemSprite";
import type { TileHologramProvider } from "./element/tileHologram";
import type { Gui } from "./gui";
import { GuiCursor } from "./guiCursor";

export class GuiManager {
    public readonly guiContainers = new Map<string, GuiContainer>;
    public readonly guiCursor = new GuiCursor;
    public readonly view = new Container;
    public readonly onUpdate = new Signal<() => void>;

    private lastWidth: number = 0;
    private lastHeight: number = 0;
    private lastPixelRatio: number = 0;
    
    public constructor(
        public readonly hologramProvider: TileHologramProvider,
        public readonly itemSpriteProvider: GuiItemSpriteProvider,
        public readonly pointerLock: PointerLock
    ) {}
    
    public isGuiOpen(id: string) {
        return this.guiContainers.has(id);
    }
    public async closeGui(id: string) {
        const container = this.guiContainers.get(id);
        if(container == null) return;

        // lock if the last modal was closed
        if(container.gui.type.modal && this.getOpenModalCount() === 1) {
            await this.pointerLock.lock();
        }

        container.removeFromParent();
        container.destroy();
        this.guiContainers.delete(id);

        this.onUpdate.emit();
    }
    public getTopModal() {
        return this.guiContainers.values().filter(gui => gui.gui.type.modal).toArray().pop();
    }
    public getOpenModalCount() {
        return this.guiContainers.values().reduce((a, gui) => gui.gui.type.modal ? a + 1 : a, 0);
    }
    public openGui(gui: Gui, cursor: EventCursor, zIndex?: number) {
        const id = gui.type.id;
        if(this.guiContainers.has(id)) throw new ReferenceError("Gui with type " + id + " is already open");

        try {
            const guiContainer = new GuiContainer(gui,
                this.hologramProvider,
                this.itemSpriteProvider,
                this.guiCursor
            );

            if(gui.type.modal) {
                this.pointerLock.unlock();
            }

            this.guiContainers.set(id, guiContainer);

            const size = guiContainer.getSize();
            guiContainer.pivot.set(size.width / 2, size.height / 2);

            if(zIndex != null) guiContainer.zIndex = zIndex;
            this.view.addChild(guiContainer);

            this.resize(this.lastWidth, this.lastHeight, this.lastPixelRatio);
            
            this.onUpdate.emit();
            this.update(cursor);

            return guiContainer;
        } catch(e) {
            throw new Error("Failed to open gui " + id, { cause: e });
        }
    }

    public resize(width: number, height: number, pixelRatio: number) {
        this.lastWidth = width;
        this.lastHeight = height;
        this.lastPixelRatio = pixelRatio;

        for(const gui of this.guiContainers.values()) {
            const type = gui.gui.type;

            gui.position.set(
                width * type.anchor[0] + type.offset[0],
                height * type.anchor[1] + type.offset[1]
            );
        }
    }

    public update(cursor: EventCursor) {
        for(const guiName of this.guiContainers.keys()) {
            const gui = this.guiContainers.get(guiName)!;

            const cursorClone = cursor.clone();
            try {
                gui.updateAllGraphics(cursorClone);
            } catch(e) {
                throw new EventError("Failed to update ui " + guiName, { cause: e, cursor: cursorClone });
            }
        }
    }
    public getOpenGui(id: string) {
        return this.guiContainers.get(id);
    }
}