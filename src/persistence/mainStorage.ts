import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface MainStorageSchema extends DBSchema {
    data: {
        key: string,
        value: {
            key: string,
            value: any
        }
    }
}

export class MainStorage {
    public static readonly SCHEMA_VERSION = 1;
    private readonly db: Promise<IDBPDatabase<MainStorageSchema>>;
    public constructor() {
        this.db = openDB<MainStorageSchema>(
            "main_storage", MainStorage.SCHEMA_VERSION, {
            upgrade(database, oldVersion, newVersion, transaction, event) {
                database.createObjectStore("data", {
                    keyPath: "key"
                });
            },
        })
    }

    public async get(key: string): Promise<any> {
        const db = await this.db;

        const pair = await db.get("data", key);
        if(pair == null) return null;

        return pair.value;
    }

    public async set(key: string, value: any) {
        const db = await this.db;

        const transaction = db.transaction("data", "readwrite", { durability: "strict" });
        const store = transaction.objectStore("data");
        await store.put({ key, value });
    }

    public async delete(key: string) {
        const db = await this.db;

        const transaction = db.transaction("data", "readwrite", { durability: "strict" });
        const store = transaction.objectStore("data");
        await store.delete(key);
    }
}