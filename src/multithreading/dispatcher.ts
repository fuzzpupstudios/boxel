import { OrderedSet } from "../utilTypes";
import { ThreadWorker } from "./worker";

export abstract class ThreadDispatcher<Config> {
    private readonly availableWorkers = new Array<ThreadWorker<Config>>;
    private readonly availableWorkerQueue = new OrderedSet<(worker: ThreadWorker<Config>) => void>;

    public constructor(
        public readonly url: URL | string
    ) {
        
    }
    
    public async createWorker() {
        const worker = new ThreadWorker<Config>(this.url);
        
        await worker.init(this.createWorkerConfig(worker));
        this.returnWorker(worker);
    }

    protected abstract createWorkerConfig(worker: ThreadWorker<Config>): Config;

    protected async getWorker() {
        let worker = this.availableWorkers.pop();
        if(worker != null) return worker;

        const { promise, resolve } = Promise.withResolvers<ThreadWorker<Config>>();
        this.availableWorkerQueue.push(resolve);
        return await promise;
    }

    protected async returnWorker(worker: ThreadWorker<Config>) {
        const handler = this.availableWorkerQueue.shift();

        if(handler) {
            handler(worker);
        } else {
            this.availableWorkers.unshift(worker);
        }
    }
}