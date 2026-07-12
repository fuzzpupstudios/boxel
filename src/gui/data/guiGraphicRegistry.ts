import { KeyedRegistry } from "objectregistry";
import type { GuiGraphicContainer } from "./guiGraphic";
import { GuiIconButtonGraphicContainer } from "./guiIconButtonGraphic";
import { GuiClickBoxGraphicContainer } from "./guiClickBoxGraphic";

export const guiGraphicRegistry = new KeyedRegistry<new (graphicId: string, args: any) => GuiGraphicContainer>

guiGraphicRegistry.register("icon_button", GuiIconButtonGraphicContainer);
guiGraphicRegistry.register("click_box", GuiClickBoxGraphicContainer);