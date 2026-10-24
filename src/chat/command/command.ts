import type { CommandExecutor } from "./commandExecutor";

export abstract class Command {
    public readonly rawArgs: any[];
    public readonly calledName: string;

    public constructor(line: string) {
        let escaped = false;
        let quoted = false;
        let objectLevel = 0;
        let completedObject = false;

        let currentData = "";
        const args: any[] = [];

        const objectBeginnings = new Set(["{", "["]);
        const objectTerminators = new Set(["}", "]"]);

        for(let i = 0; i < line.length; i++) {
            let char = line[i];
            
            if(completedObject) {
                if(char === " ") {
                    args.push(JSON.parse(currentData));
                    currentData = "";
                    completedObject = false;
                } else {
                    throw new SyntaxError("Expected space delimiter at position " + i);
                }
            } else if(escaped) {
                escaped = false;

                switch(char) {
                    case "r": char = "\r"; break;
                    case "n": char = "\n"; break;
                    case "t": char = "\t"; break;
                    case "s": char = "\s"; break;
                }

                currentData += char;
            } else if(char === "\\") {
                escaped = true;
            } else if(char === "\"") {
                quoted = !quoted;
            } else if(objectTerminators.has(char)) {
                if(objectLevel === 0) throw new SyntaxError("Unexpected object terminator at position " + i);
                objectLevel--;

                if(objectLevel === 0) {
                    completedObject = true;
                }
            } else if(!quoted && currentData.length == 0 && objectBeginnings.has(char)) {
                objectLevel++;
            } else if(!quoted && char === " ") {
                args.push(currentData);
                currentData = "";
            } else {
                currentData += char;
            }
        }

        args.push(currentData);
        
        this.calledName = args.shift();
        this.rawArgs = args;
    }
    public abstract execute(executor: CommandExecutor): void;
}