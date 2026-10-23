import { EventEmitter, GET_CONFIG_EVENT, READY_EVENT, SEND_CONFIG_EVENT, type WorkerMessage } from "./events";

export class ThreadWorker<T> extends EventEmitter<WorkerMessage> {
    public worker?: Worker;

    public constructor(
        public readonly url: string | URL
    ) {
        super();
    }

    public send(message: WorkerMessage, transfer?: Transferable[]) {
        /* @ts-expect-error */
        this.worker?.postMessage(message, transfer);
    }
    
    public init(config: T) {
        this.worker = new Worker(this.url, { type: "module" });

        this.worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
            this.emit(event.data.type, event.data);
        });

        this.setHandler(GET_CONFIG_EVENT, () => {
            this.send({ type: SEND_CONFIG_EVENT, config });
        })

        return new Promise<void>(res => {
            this.setHandler(READY_EVENT, () => {
                this.deleteHandler(READY_EVENT);
                res();
            })
        });
    }
}