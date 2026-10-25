import { isMobile } from "pixi.js";
import { blockStateRegistry } from "./block/blockRegistry";
import { blockEntityTypeRegistry } from "./block/entity/blockEntityRegistry";
import { BoxelGame } from "./boxel";
import { generateCrashReport } from "./crash";
import { guiGraphicRegistry } from "./gui/graphic/graphicRegistry";
import { guiTypeRegistry } from "./gui/guiTypeRegistry";
import { itemRegistry } from "./item/itemRegistry";

main();

async function main() {
    const game = new BoxelGame(document.body, {
        isDesktop: !isMobile.any,
        version: (await import("../package.json")).version
    });

    function onResize() {
        game.resize(Math.min(innerWidth, outerWidth), Math.min(innerHeight, outerHeight), devicePixelRatio);
    };
    function onGamepadConnected(event: GamepadEvent) {
        game.attachController(event.gamepad);
    }
    function onGamepadDisconnected(event: GamepadEvent) {
        game.attachController(event.gamepad);
    }
    function onBlur() {
        game.onUnfocus();
    }
    function onFocus() {
        game.onFocus();
    }


    window.addEventListener("resize", onResize);
    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
    window.addEventListener("blur", onBlur);
    document.body.addEventListener("focusout", onBlur);
    window.addEventListener("focus", onFocus);
    document.body.addEventListener("focusin", onFocus);

    game.onCrash.connect((error) => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("gamepadconnected", onGamepadConnected);
        window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
        window.removeEventListener("blur", onBlur);
        document.body.removeEventListener("focusout", onBlur);
        window.removeEventListener("focus", onFocus);
        document.body.removeEventListener("focusin", onFocus);

        showCrashScreen(game, error);
    })

    await game.start();
    game.resize(Math.min(innerWidth, outerWidth), Math.min(innerHeight, outerHeight), devicePixelRatio);


    (<any>window).enableDebugOptions = function() {
        const gt = <any>window;
        
        gt.game = game;
        gt.blockStateRegistry = blockStateRegistry;
        gt.itemRegistry = itemRegistry;
        gt.guiGraphicRegistry = guiGraphicRegistry;
        gt.blockEntityTypeRegistry = blockEntityTypeRegistry;
        gt.inventoryGuiTypeRegistry = guiTypeRegistry;
    }
}

function showCrashScreen(game: BoxelGame, error: any) {
    const root = document.createElement("div");
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.position = "fixed";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.top = "0";
    root.style.left = "0";
    root.style.background = "#200";
    root.style.font = "1rem sans-serif";
    root.style.color = "white";
    root.style.padding = "1rem";
    root.style.boxSizing = "border-box";

    const title = document.createElement("h1");
    title.textContent = "Game Crashed!";
    title.style.textAlign = "center";
    root.append(title);

    const subtitle = document.createElement("p");
    subtitle.textContent = "Boxel has encountered an uncaught exception. View the console for more details.\nThe crash report is printed below.";
    subtitle.style.whiteSpace = "pre";
    root.append(subtitle);
    console.error(error);

    const crashReport = document.createElement("textarea");
    crashReport.textContent = generateCrashReport(game, error);
    crashReport.readOnly = true;
    crashReport.style.resize = "none";
    crashReport.style.width = "100%";
    crashReport.style.height = "100%";
    crashReport.style.boxSizing = "border-box";
    crashReport.style.background = "#000";
    crashReport.style.border = "2px solid #f88";
    crashReport.style.color = "white";
    root.append(crashReport);

    document.body.append(root);
}