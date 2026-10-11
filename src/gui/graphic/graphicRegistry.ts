import { KeyedRegistry } from "objectregistry";
import { GuiClickBoxGraphicContainer } from "./clickBox";
import type { GuiGraphicContainer } from "./graphic";
import { GuiIconButtonGraphicContainer } from "./iconButton";
import { GuiTextGraphicContainer } from "./text";
import { GuiProgressBarGraphicContainer } from "./progress";

export const guiGraphicRegistry = new KeyedRegistry<new (graphicId: string, args: any) => GuiGraphicContainer>

guiGraphicRegistry.register("icon_button", GuiIconButtonGraphicContainer);
guiGraphicRegistry.register("text", GuiTextGraphicContainer);
guiGraphicRegistry.register("click_box", GuiClickBoxGraphicContainer);
guiGraphicRegistry.register("progress", GuiProgressBarGraphicContainer);