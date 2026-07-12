import { Signal } from "typed-signals";
import type { EventCursor } from "../../events/eventSheet";
import type { Container } from "pixi.js";

export function isGuiGraphicContainer(object: any): object is GuiGraphicContainer {
    return object.isGuiGraphicContainer === true;
}

export interface GuiGraphicContainer extends Container {
    readonly graphicId: string;
    readonly isGuiGraphicContainer: true;
}