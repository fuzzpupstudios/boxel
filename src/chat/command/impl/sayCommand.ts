import { Player } from "../../../entity/player";
import { Command } from "../command";
import type { CommandExecutor } from "../commandExecutor";

export class SayCommand extends Command {
    private readonly text: string;

    public constructor(line: string) {
        super(line);

        this.text = this.rawArgs.map(v => typeof v == "object" ? JSON.stringify(v) : v).join(" ");
    }
    public execute(executor: CommandExecutor) {
        let name = "Server";
        if(executor.entity instanceof Player) {
            name = executor.entity.id;
        }

        executor.chat.log(`[${name}] ${this.text}`);
    }
}