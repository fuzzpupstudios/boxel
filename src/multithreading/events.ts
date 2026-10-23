export const GET_CONFIG_EVENT = "$get_config" as const;
export const SEND_CONFIG_EVENT = "$config" as const;
export const READY_EVENT = "$ready" as const;

export type WorkerMessage = { type: string, [ key: string ]: any };
export type EventHandler<T> = (event: T) => void;

export class EventEmitter<T> {
    protected readonly handlers = new Map<string, EventHandler<T>>;

    public emit(type: string, data: T) {
        this.handlers.get(type)?.(data);
    }
    public setHandler(type: string, handler: EventHandler<T>) {
        this.handlers.set(type, handler);
    }
    public deleteHandler(type: string) {
        this.handlers.delete(type);
    }
    public once(type: string) {
        const { promise, resolve } = Promise.withResolvers<T>();
        
        this.setHandler(type, event => {
            this.deleteHandler(type);
            resolve(event);
        });
        
        return promise;
    }
}