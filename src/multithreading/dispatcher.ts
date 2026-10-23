import { OrderedSet } from "../utilTypes";
import { ThreadWorker } from "./worker";

export class ThreadDispatcher<Config = {}> {
    private readonly availableWorkers = new Array<ThreadWorker<Config>>;
    private readonly availableWorkerQueue = new OrderedSet<(worker: ThreadWorker<Config>) => void>;

    public constructor(
        public readonly url: URL | string
    ) { }
    
    public async createWorker(config: Config) {
        const worker = new ThreadWorker<Config>(this.url);
        
        await worker.init(config);
        this.returnWorker(worker);

        return worker;
    }

    public async getWorker() {
        let worker = this.availableWorkers.pop();
        if(worker != null) return worker;

        const { promise, resolve } = Promise.withResolvers<ThreadWorker<Config>>();
        this.availableWorkerQueue.push(resolve);
        return await promise;
    }

    public async returnWorker(worker: ThreadWorker<Config>) {
        const handler = this.availableWorkerQueue.shift();

        if(handler) {
            handler(worker);
        } else {
            this.availableWorkers.unshift(worker);
        }
    }
}