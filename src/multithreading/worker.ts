import { EventEmitter, GET_CONFIG_EVENT, READY_EVENT, SEND_CONFIG_EVENT, type WorkerMessage } from "./events";

export class ThreadWorker<T> extends EventEmitter<WorkerMessage> {
    private worker: Worker | null = null;

    public constructor(
        public readonly url: string | URL
    ) {
        super();
    }

    public terminate() {
        if(this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        super.dispose();
    }

    public get terminated() {
        return this.worker === null;
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