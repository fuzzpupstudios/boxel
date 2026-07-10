import { isMobile } from "pixi.js";
import { BoxelGame } from "./boxel";
import { preloadFastNoise2Module } from "./fastnoise/fastnoise2";
import { blockStateRegistry } from "./block/blockRegistry";

main();

async function main() {
    await preloadFastNoise2Module();

    const game = new BoxelGame(document.body, {
        isDesktop: !isMobile.any,
        version: (await import("../package.json")).version
    });

    window.addEventListener("resize", () => {
        game.resize(innerWidth, innerHeight, devicePixelRatio);
    });

    window.addEventListener("gamepadconnected", event => {
        game.attachController(event.gamepad);
    });
    window.addEventListener("gamepaddisconnected", event => {
        game.detachController(event.gamepad);
    });

    await game.start();
    game.resize(innerWidth, innerHeight, devicePixelRatio);
}