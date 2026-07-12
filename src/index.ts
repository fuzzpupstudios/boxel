import { isMobile } from "pixi.js";
import { BoxelGame } from "./boxel";
import { preloadFastNoise2Module } from "./fastnoise/fastnoise2";
import { blockStateRegistry } from "./block/blockRegistry";
import { guiGraphicRegistry } from "./gui/data/guiGraphicRegistry";
import { inventoryGuiTypeRegistry } from "./item/inventoryGuiTypeRegistry";

main();

async function main() {
    await preloadFastNoise2Module();

    const game = new BoxelGame(document.body, {
        isDesktop: !isMobile.any,
        version: (await import("../package.json")).version
    });

    window.addEventListener("resize", () => {
        game.resize(Math.min(innerWidth, outerWidth), Math.min(innerHeight, outerHeight), devicePixelRatio);
    });

    window.addEventListener("gamepadconnected", event => {
        game.attachController(event.gamepad);
    });
    window.addEventListener("gamepaddisconnected", event => {
        game.detachController(event.gamepad);
    });

    await game.start();
    game.resize(Math.min(innerWidth, outerWidth), Math.min(innerHeight, outerHeight), devicePixelRatio);
}