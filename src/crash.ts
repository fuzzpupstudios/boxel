import type { Scene } from "three";
import type { BoxelGame } from "./boxel";
import type { Player } from "./entity/player";


function stringifyError(error: any) {
    let message = "Uncaught ";
    
    while(error != null) {
        message += error + "\n";
        if(error.stack) {
            message += error.stack + "\n";
        }

        if(error.cause != null) {
            message += "Caused by ";
        }
        error = error.cause;
    }

    return message;
}

function countConstructors(items: Iterable<{ constructor: { name: string } }>) {
    const total = Array.from(items).length;
    if(total == 0) return "<none>";
    
    return Object.entries(Object.groupBy(items, item => item.constructor.name))
    .map(([ name, items ]) => items?.length + "x " + name).join(", ") + " (" + total + " total)";
}

export function generateCrashReport(game: BoxelGame, error: any) {
    const localPlayer = game.activeStages.find(stage => "localPlayer" in stage)?.localPlayer as Player | undefined;

    return `
#### Begin Crash Report ####
Generated at: ${new Date().toISOString()}
Game version: Boxel ${game.version}
Active stages: ${game.activeStages.map(stage => stage.constructor.name).join(", ") || "<none>"}
${localPlayer ? `
Player:
    position: ${localPlayer.position.toArray()}
    velocity: ${localPlayer.velocity.toArray()}
    pitch: ${localPlayer.pitch}
    yaw: ${localPlayer.yaw}
Tickables: ${countConstructors(localPlayer.world.tickables)}
Renderables: ${countConstructors((() => {
    const items = new Set<any>;
    localPlayer.world.renderer?.scene.traverse(object => items.add(object))
    return items;
})())}
` : ""}

## Stack Trace ##
${stringifyError(error)}
#### End Crash Report ####
`.trim()
}