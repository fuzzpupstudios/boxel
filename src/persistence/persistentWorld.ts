import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { Chunk } from "../world/world";
import { VoxelChunk } from "../world/voxelGrid";
import z from "zod";
import { Player } from "../entity/player";
import { CHUNK_SCHEMA_VERSION, chunkUpgrades } from "./upgrade";
import { LightingChunk } from "../world/lighting/lightingGrid";

export interface SerializedChunk {
    version: number,
    x: number,
    y: number,
    z: number,
    tiles: ArrayBuffer,
    lighting: ArrayBuffer,
    palette: string[]
}

export type WorldMeta = z.infer<typeof WorldMeta>;
export const WorldMeta = z.object({
    seed: z.number().default(-1)
});

export type WorldPlayer = z.infer<typeof WorldPlayer>;
export const WorldPlayer = z.object({
    id: z.string(),
    position: z.tuple([
        z.number(),
        z.number(),
        z.number()
    ]).default([ 0, 128, 0 ]),
    velocity: z.tuple([
        z.number(),
        z.number(),
        z.number()
    ]).default([ 0, 0, 0 ]),
    rotation: z.tuple([
        z.number(),
        z.number()
    ]).default([ 0, 0 ]),
    gliding: z.boolean().default(false)
});

interface PersistentWorldSchema extends DBSchema {
    chunks: {
        key: [ number, number, number ],
        value: SerializedChunk
    },
    meta: {
        key: "meta",
        value: { key: "meta" } & WorldMeta
    },
    players: {
        key: string,
        value: WorldPlayer
    }
}

export class PersistentWorld {
    public static readonly SCHEMA_VERSION = 1;
    private readonly db: Promise<IDBPDatabase<PersistentWorldSchema>>;
    private readonly allKeys = new Set<number>;

    public constructor(
        public readonly worldId: string
    ) {
        this.db = openDB<PersistentWorldSchema>(
            "world$" + worldId, PersistentWorld.SCHEMA_VERSION, {
            upgrade(database, oldVersion, newVersion, transaction, event) {
                database.createObjectStore("chunks", {
                    keyPath: [ "x", "y", "z" ]
                });
                database.createObjectStore("meta", {
                    keyPath: "key"
                });
                database.createObjectStore("players", {
                    keyPath: "id"
                });
            },
        })
    }

    public async saveMeta(meta: WorldMeta) {
        const db = await this.db;

        const object = Object.assign({ key: "meta" as const }, meta);

        await db.put("meta", object);
    }

    public async loadMeta(): Promise<WorldMeta | null> {
        const db = await this.db;

        const meta = await db.get("meta", "meta") as WorldMeta;
        if(meta == null) return null;

        delete (<any>meta).key;

        return WorldMeta.parse(meta);
    }

    public async savePlayerSlot(id: string, player: Player) {
        const db = await this.db;

        await db.put("players", {
            id,
            position: player.aabb.position.toArray(),
            velocity: player.velocity.toArray(),
            rotation: [ player.yaw, player.pitch ],
            gliding: player.gliding
        });
    }

    public async loadPlayerSlot(id: string) {
        const db = await this.db;

        const data = await db.get("players", id);
        const worldPlayer = WorldPlayer.parse(data ?? { id });

        return worldPlayer;
    }

    public async init() {
        const db = await this.db;

        const allKeys = await db.getAllKeys("chunks");

        this.allKeys.clear();
        for(const key of allKeys) {
            const encodedKey = this.encodeChunkKey(key[0], key[1], key[2]);
            this.allKeys.add(encodedKey);
        }
    }
    public async close() {
        const db = await this.db;
        db.close();
    }

    private encodeChunkKey(x: number, y: number, z: number): number {
        return ((x & 0x3FF) << 20) | ((y & 0x3FF) << 10) | (z & 0x3FF);
    }

    public hasChunk(x: number, y: number, z: number) {
        const encodedKey = this.encodeChunkKey(x, y, z);
        return this.allKeys.has(encodedKey);
    }

    public async saveChunk(chunk: Chunk) {
        await this.saveChunks([ chunk ]);
    }

    public async saveChunks(chunks: Iterable<Chunk>) {
        const db = await this.db;

        const transaction = db.transaction("chunks", "readwrite");
        const chunksStore = transaction.objectStore("chunks");

        for(const chunk of chunks) {
            const serializedChunk = this.serializeChunk(chunk);

            chunksStore
                .put(serializedChunk)
                .then(([ x, y, z ]) => {
                    const encodedKey = this.encodeChunkKey(x, y, z);
                    this.allKeys.add(encodedKey);
                })
        }

        await transaction.done;
    }

    public async loadChunk(x: number, y: number, z: number) {
        const db = await this.db;

        const serializedChunk = await db.get("chunks", [ x, y, z ]);
        if(serializedChunk == null) return null;

        // perform chunk schema upgrades
        let upgraded = false;
        
        if(serializedChunk.version == null) serializedChunk.version = -1;
        for(let i = serializedChunk.version + 1; i < chunkUpgrades.length; i++) {
            console.log("upgraded chunk " + serializedChunk.x + ", " +
                serializedChunk.y + ", " + serializedChunk.z + " to version " + i);
            upgraded = true;
            chunkUpgrades[i]!(serializedChunk);
        }

        const chunk = this.deserializeChunk(serializedChunk);
        
        if(upgraded) {
            await this.saveChunk(chunk);
        }

        return chunk;
    }

    private serializeChunk(chunk: Chunk): SerializedChunk {
        return {
            version: CHUNK_SCHEMA_VERSION,
            x: chunk.x, y: chunk.y, z: chunk.z,
            tiles: chunk.tiles.tiles.buffer,
            palette: chunk.tiles.palette,
            lighting: chunk.lighting.values.buffer
        }
    }

    private deserializeChunk(serialized: SerializedChunk): Chunk {
        const voxelChunk = new VoxelChunk;
        const lightingChunk = new LightingChunk;
        
        voxelChunk.tiles.set(new Uint8Array(serialized.tiles));
        lightingChunk.values.set(new Uint16Array(serialized.lighting));
        for(let i = 0; i < serialized.palette.length; i++) {
            voxelChunk.palette[i] = serialized.palette[i]!;
            voxelChunk.paletteMap.set(serialized.palette[i]!, i);
        }
        const chunk = new Chunk(serialized.x, serialized.y, serialized.z, voxelChunk, lightingChunk);

        return chunk;
    }
}