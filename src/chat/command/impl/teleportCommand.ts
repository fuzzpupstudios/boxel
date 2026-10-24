import z from "zod";
import { Player } from "../../../entity/player";
import { Command } from "../command";
import type { CommandExecutor } from "../commandExecutor";

const coordinateValue = z.coerce.number().or(z.stringFormat("coordinate-value", s => s[0] == "~" && !isNaN(+s.slice(1))));

const schema = z.tuple([
    coordinateValue, coordinateValue, coordinateValue
])

export class TeleportCommand extends Command {
    private x?: number;
    private dx?: number;
    private y?: number;
    private dy?: number;
    private z?: number;
    private dz?: number;

    public constructor(line: string) {
        super(line);

        const parsedArgs = schema.parse(this.rawArgs);
        
        if(typeof parsedArgs[0] == "number") {
            this.x = parsedArgs[0];
        } else {
            this.dx = +parsedArgs[0].slice(1);
        }
        
        if(typeof parsedArgs[1] == "number") {
            this.y = parsedArgs[1];
        } else {
            this.dy = +parsedArgs[1].slice(1);
        }
        
        if(typeof parsedArgs[2] == "number") {
            this.z = parsedArgs[2];
        } else {
            this.dz = +parsedArgs[2].slice(1);
        }
    }
    public execute(executor: CommandExecutor) {
        if(executor.entity instanceof Player) {
            const x = this.x ?? (executor.entity.position.x + this.dx!);
            const y = this.y ?? (executor.entity.position.y + this.dy!);
            const z = this.z ?? (executor.entity.position.z + this.dz!);

            executor.entity.position.set(x, y, z);

            executor.chat.log(`Teleported ${executor.entity.id} to ${x} ${y} ${z}`);
        } else throw new TypeError("Must be executed by a player");
    }
}