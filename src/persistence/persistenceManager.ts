import { PersistentWorld } from "./persistentWorld";

export class PersistenceManager {
    private readonly openWorlds = new Set<PersistentWorld>;

    public openWorld(worldId: string) {
        return new PersistentWorld(worldId);
    }
    public async closeWorld(persistentWorld: PersistentWorld) {
        await persistentWorld.close();
        this.openWorlds.delete(persistentWorld);
    }
}