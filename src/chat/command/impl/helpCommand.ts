import { Command } from "../command";
import type { CommandExecutor } from "../commandExecutor";

const commands = [
    {
        aliases: [ "gamemode", "gm" ],
        description: "Sets the game mode of the current player",
        usage: "/gamemode <0 | 1>"
    },
    {
        aliases: [ "list" ],
        description: "Lists all players online (just local for now!)",
        usage: "/list"
    },
    {
        aliases: [ "say" ],
        description: "Says a message in chat; useful for debugging",
        usage: "/say [text]"
    },
    {
        aliases: [ "teleport", "tp" ],
        description: "Teleports the current player to a location",
        usage: "/tp [~]<x> [~]<y> [~]<z>"
    },
    {
        aliases: [ "help" ],
        description: "Prints out this message",
        usage: "/help"
    }
]

export class HelpCommand extends Command {
    public constructor(line: string) {
        super(line);
    }
    public execute(executor: CommandExecutor) {
        let message = "Showing help for " + commands.length + " command(s):";

        for(const command of commands) {
            message += "\n" + command.aliases.map(v => "/" + v).join(", ");
            message += "\n  " + command.description;
            message += "\n  Usage: " + command.usage;
        }
        executor.chat.log(message);
    }
}