import z from "zod";
import { Player } from "../../../entity/player";
import { Command } from "../command";
import type { CommandExecutor } from "../commandExecutor";

const schema = z.tuple([
    z.enum([ "0", "1" ])
])

export class GamemodeCommand extends Command {
    private gamemode: "0" | "1";

    public constructor(line: string) {
        super(line);

        const parsedArgs = schema.parse(this.rawArgs);
        this.gamemode = parsedArgs[0];
    }
    public execute(executor: CommandExecutor) {
        if(executor.entity instanceof Player) {

            if(this.gamemode == "1") {
                executor.entity.canFly = true;
                executor.entity.instabreak = true;
                executor.entity.infiniteItems = true;

                executor.chat.log(`Set gamemode of ${executor.entity.id} to creative`);
            } else {
                executor.entity.canFly = false;
                executor.entity.instabreak = false;
                executor.entity.infiniteItems = false;

                executor.chat.log(`Set gamemode of ${executor.entity.id} to survival`);
            }
        } else throw new TypeError("Must be executed by a player");
    }
}