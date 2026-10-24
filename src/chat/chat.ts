import { Signal } from "typed-signals";

export class ChatMessage {
    public iid: number;

    public constructor(
        public contents: string
    ) {
        this.iid = Math.random();
    }

    public setContents(contents: string) {
        this.contents = contents;
        this.iid = Math.random();
    }
}

export class Chat {
    public readonly logs = new Array<ChatMessage>;
    public readonly onUpdate = new Signal<() => void>;

    public addMessage(message: ChatMessage) {
        this.logs.push(message);
        this.onUpdate.emit();
    }

    public log(text: string) {
        this.addMessage(new ChatMessage(text));
    }
}