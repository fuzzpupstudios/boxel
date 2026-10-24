import type { Player } from "../../../entity/player";
import { Command } from "../command";
import type { CommandExecutor } from "../commandExecutor";

export class ListCommand extends Command {
    public execute(executor: CommandExecutor) {
        const players = new Array<Player>;

        if(executor.stage.localPlayer) {
            players.push(executor.stage.localPlayer);
        }

        let playersString = "";
        
        for(const player of players) {
            playersString += "\n - " + player.id;
        }

        if(players.length == 1) {
            executor.chat.log("There is 1 player online:" + playersString);
        } else {
            executor.chat.log("There are " + players.length + " players online:" + playersString);
        }
    }
}