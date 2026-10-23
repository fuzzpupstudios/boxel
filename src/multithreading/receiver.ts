import { EventEmitter, GET_CONFIG_EVENT, READY_EVENT, SEND_CONFIG_EVENT, type EventHandler, type WorkerMessage } from "./events";

export class ThreadReceiver<T> extends EventEmitter<WorkerMessage> {
    public constructor() {
        super();
        
        globalThis.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
            this.emit(event.data.type, event.data);
        })
    }

    public send(message: WorkerMessage, transfer?: Transferable[]) {
        /* @ts-expect-error */
        globalThis.postMessage(message, transfer);
    }

    public getConfig() {
        return new Promise<T>(res => {
            const handler: EventHandler<WorkerMessage> = message => {
                this.deleteHandler(SEND_CONFIG_EVENT);
                res(message.config);
            }

            this.setHandler(SEND_CONFIG_EVENT, handler);
            this.send({ type: GET_CONFIG_EVENT });
        })
    }

    public ready() {
        this.send({ type: READY_EVENT });
    }
}