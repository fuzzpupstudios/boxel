import { OrderedSet } from "../utilTypes";
import { WorkerTerminationError } from "./error";
import { ThreadWorker } from "./worker";

export class ThreadDispatcher<Config = {}> {
    private readonly availableWorkers = new Array<ThreadWorker<Config>>;
    private readonly availableWorkerQueue = new OrderedSet<PromiseWithResolvers<ThreadWorker<Config>>>;
    private terminated = false;

    public constructor(
        public readonly url: URL | string
    ) { }

    public terminate() {
        this.terminated = true;
        for(const worker of this.availableWorkers.splice(0)) {
            worker.terminate();
        }

        for(const job of this.availableWorkerQueue) {
            job.reject(new Error("Worker terminated before work could be obtained"));
        }
        this.availableWorkerQueue.clear();
    }
    
    public async createWorker(config: Config) {
        const worker = new ThreadWorker<Config>(this.url);
        
        await worker.init(config);
        this.returnWorker(worker);

        return worker;
    }

    public async getWorker() {
        if(this.terminated) throw new WorkerTerminationError("Cannot get threads when the dispatcher is terminated");

        let worker = this.availableWorkers.pop();
        if(worker != null) return worker;

        const job = Promise.withResolvers<ThreadWorker<Config>>();
        this.availableWorkerQueue.push(job);
        return await job.promise;
    }

    public async returnWorker(worker: ThreadWorker<Config>) {
        if(this.terminated) worker.terminate();
        if(worker.terminated) return;

        const job = this.availableWorkerQueue.shift();

        if(job) {
            job.resolve(worker);
        } else {
            this.availableWorkers.unshift(worker);
        }
    }
}