import { Container, Graphics } from "pixi.js";
import { Signal, type SignalConnection } from "typed-signals";
import type { Chat, ChatMessage } from "../../chat/chat";
import { GuiText } from "../element/text";
import { GuiTextBox } from "../element/textBox";
import type { Time } from "../../time";
import { CommandNotFoundError, commandRegistry, parseCommand } from "../../chat/command/commandRegistry";
import type { Command } from "../../chat/command/command";
import { ZodError } from "zod";

class ChatMessageElement extends Container {
    public life = 0;
    public readonly background: Graphics;
    public readonly textElement: GuiText;

    public constructor(
        public readonly message: ChatMessage
    ) {
        const background = new Graphics;
        background.alpha = 0.5;

        const textElement = new GuiText({
            fontScale: 0.75,
            wordWrap: true
        }, {
            x: 4,
            y: 1
        });

        super({
            children: [ background, textElement ]
        });

        this.background = background;
        this.textElement = textElement;
        this.update();
    }

    private updateBackground() {
        this.background.clear().rect(0, 0, this.textElement.wordWrapWidth, this.textElement.height + 2).fill(0x000000);
    }

    public setWidth(width: number) {
        this.textElement.wordWrapWidth = width;
        this.updateBackground();
    }

    public update() {
        this.textElement.text = this.message.contents;
        this.updateBackground();
    }
}

class ChatGuiMessageBar extends Container {
    public readonly messageBox: GuiTextBox;

    public readonly onSubmit = new Signal<(text: string) => void>;
    public readonly onClose = new Signal<() => void>;

    private readonly history = new Array<string>;
    private historyIndex = -1;

    public constructor() {
        const messageBox = new GuiTextBox("", 320, 14, 0.75);

        super({
            children: [ messageBox ]
        })

        this.messageBox = messageBox;

        messageBox.on("tap", () => {
            this.messageBox.focus();
        });
    }

    public newerHistory() {
        if(this.historyIndex <= -1) return;

        this.historyIndex--;
        if(this.historyIndex === -1) {
            this.messageBox.value = "";
        } else {
            this.messageBox.value = this.history[this.historyIndex];
        }
    }
    public olderHistory() {
        if(this.historyIndex >= this.history.length - 1) return;

        this.historyIndex++;
        this.messageBox.value = this.history[this.historyIndex];
    }

    public trySubmit() {
        const text = this.messageBox.value;
        if(!/[^\s\t\r\n]/.test(text)) {
            this.focus();
            return;
        }

        this.onSubmit.emit(text);

        if(text != this.history[0]) {
            this.history.unshift(text);
        }
        this.historyIndex = -1;
    }

    public focus() {
        this.messageBox.focus();
    }

    public clear() {
        this.messageBox.value = "";
        this.historyIndex = -1;
    }

    public setWidth(width: number) {
        this.messageBox.width = width;
    }

    public setText(text: string) {
        this.messageBox.value = text;
    }
}

export class ChatGUI extends Container {
    private readonly chatLog: Container;
    private readonly chatLogMask: Graphics;
    public readonly messageBar: ChatGuiMessageBar;

    private readonly chatMessageElements = new Map<number, ChatMessageElement>;
    private readonly renderedChatMessages = new WeakMap<ChatMessage, ChatMessageElement>;
    private readonly chat: Chat;
    
    private readonly onUpdateConnection: SignalConnection;
    
    private fullWidth: number = 1;
    private fullHeight: number = 1;
    private chatWidth: number = 1;
    private chatHeight: number = 1;

    public messageBarOpen = false;
    public readonly onClose = new Signal<() => void>;
    public readonly onMessage = new Signal<(message: string) => void>;
    public readonly onCommand = new Signal<(command: Command) => void>;

    public constructor(chat: Chat) {
        const chatLogMask = new Graphics;
        chatLogMask.pivot.set(0, 0);

        const chatLog = new Container({ mask: chatLogMask });
        chatLog.pivot.set(0, 0);

        const messageBar = new ChatGuiMessageBar;

        super({
            children: [ chatLog, chatLogMask ]
        })

        this.chatLogMask = chatLogMask;
        this.chatLog = chatLog;
        this.messageBar = messageBar;

        this.chat = chat;
        this.onUpdateConnection = chat.onUpdate.connect(() => this.update());

        messageBar.onSubmit.connect(text => {
            try {
                if(text.startsWith("/")) {
                    if(text.length > 1) this.trySendCommand(text);
                } else {
                    this.onMessage.emit(text);
                }
            } finally {
                this.closeMessageBar();
                this.messageBar.clear();
                this.onClose.emit();
            }
        });
        messageBar.onClose.connect(() => {
            this.closeMessageBar();
            this.onClose.emit();
        })
    }

    private trySendCommand(text: string) {
        try {
            const command = parseCommand(text.slice(1));
            this.onCommand.emit(command);
        } catch(e) {
            if(e instanceof CommandNotFoundError) {
                this.chat.log("Unknown command: " + e.commandName);
            } else if(e instanceof ZodError) {
                this.chat.log("Failed to parse command");
                console.error(e);
            } else {
                throw e;
            }
        }
    }

    public render(time: Time) {
        for(const element of this.chatMessageElements.values()) {
            if(this.messageBarOpen) {
                element.alpha = 1;
            } else {
                element.life += time.deltaTime;

                if(element.life > 6) {
                    element.alpha = 0;
                } else if(element.life > 5) {
                    element.alpha -= time.deltaTime;
                }
            }
        }
    }

    public update() {
        const messages = this.chat.logs.slice(-100);

        const unusedIIDs = new Set(this.chatMessageElements.keys());

        let yOffset = this.chatHeight;

        for(let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];

            let chatMessageElement = this.chatMessageElements.get(message.iid);
            if(chatMessageElement) {
                unusedIIDs.delete(message.iid);
            } else {
                chatMessageElement = this.renderedChatMessages.get(message);

                if(chatMessageElement) {
                    chatMessageElement.update();
                } else {
                    chatMessageElement = new ChatMessageElement(message);
                    
                    this.chatLog.addChild(chatMessageElement);
                }

                this.chatMessageElements.set(message.iid, chatMessageElement);
            }

            yOffset -= chatMessageElement.height;
            chatMessageElement.y = yOffset;
            chatMessageElement.setWidth(this.chatWidth);
        }

        for(const iid of unusedIIDs) {
            this.chatMessageElements.get(iid)!.removeFromParent();

            this.chatMessageElements.delete(iid);
        }
    }

    public openMessageBar(defaultText = "") {
        if(this.messageBarOpen) return;

        this.messageBar.setText(defaultText);
        this.addChild(this.messageBar);
        this.messageBar.focus();

        this.messageBarOpen = true;
    }

    public closeMessageBar() {
        if(!this.messageBarOpen) return;

        this.removeChild(this.messageBar);

        this.messageBarOpen = false;
    }

    public resize(width: number, height: number) {
        this.fullWidth = width;
        this.fullHeight = height;

        let yOffset = 32;

        this.chatWidth = Math.max(width * 0.5, Math.min(320, width - 4));
        this.chatHeight = height * 0.75 - yOffset;

        this.chatLog.position.set(0, height * 0.25);

        this.messageBar.position.set(0, height - this.messageBar.height);
        this.chatLogMask.clear().rect(0, height * 0.25, this.chatWidth, this.chatHeight).fill(0xffffff);
        this.messageBar.setWidth(width);

        this.update();
    }

    public dispose() {
        this.onUpdateConnection.disconnect();
    }
}