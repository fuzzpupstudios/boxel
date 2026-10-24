import { KeyedRegistry } from "objectregistry";
import { Command } from "./command";
import { SayCommand } from "./impl/sayCommand";
import { ListCommand } from "./impl/listCommand";
import { TeleportCommand } from "./impl/teleportCommand";
import { GamemodeCommand } from "./impl/gamemodeCommand";

export class CommandNotFoundError {
    constructor(
        public readonly commandName: string
    ) {}
}

export function parseCommand(line: string) {
    let commandNameEnd = line.indexOf(" ");
    if(commandNameEnd === -1) commandNameEnd = line.length;

    const commandName = line.slice(0, commandNameEnd);

    const Command = commandRegistry.get(commandName);
    if(Command == null) throw new CommandNotFoundError(commandName);

    return new Command(line);
}

export const commandRegistry = new Map<string, new (line: string) => Command>;

commandRegistry.set("say", SayCommand);
commandRegistry.set("list", ListCommand);
commandRegistry.set("tp", TeleportCommand);
commandRegistry.set("teleport", TeleportCommand);
commandRegistry.set("gm", GamemodeCommand);
commandRegistry.set("gamemode", GamemodeCommand);