import { isMobile } from "pixi.js";
import { blockStateRegistry } from "./block/blockRegistry";
import { blockEntityTypeRegistry } from "./block/entity/blockEntityRegistry";
import { BoxelGame } from "./boxel";
import { preloadFastNoise2Module } from "./fastnoise/fastnoise2";
import { guiGraphicRegistry } from "./gui/graphic/graphicRegistry";
import { guiTypeRegistry } from "./gui/guiTypeRegistry";
import { itemRegistry } from "./item/itemRegistry";

let game: BoxelGame;
main();

async function main() {
    await preloadFastNoise2Module();

    game = new BoxelGame(document.body, {
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
    window.addEventListener("blur", () => {
        game.onUnfocus();
    });
    document.body.addEventListener("focusout", () => {
        game.onUnfocus();
    });

    await game.start();
    game.resize(Math.min(innerWidth, outerWidth), Math.min(innerHeight, outerHeight), devicePixelRatio);
}

(<any>window).enableDebugOptions = function() {
    const gt = <any>window;
    
    gt.game = game;
    gt.blockStateRegistry = blockStateRegistry;
    gt.itemRegistry = itemRegistry;
    gt.guiGraphicRegistry = guiGraphicRegistry;
    gt.blockEntityTypeRegistry = blockEntityTypeRegistry;
    gt.inventoryGuiTypeRegistry = guiTypeRegistry;
}