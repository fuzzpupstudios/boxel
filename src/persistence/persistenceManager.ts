import { MainStorage } from "./mainStorage";

export class PersistenceManager {
    public constructor() {
        
    }
    public openMainStorage() {
        return new MainStorage();
    }
}