import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import mimetics from "mimetics";
import z from "zod";
import type { MainStorage } from "../persistence/mainStorage";
import { AssetPack } from "./assetPack";
import type { Assets } from "./assets";

export type ModList = z.infer<typeof ModList>;
export const ModList = z.object({
    mods: z.string().array().default([])
});

interface ModListDatabaseFile {
    filename: string,
    file: ArrayBuffer
};

interface ModListDatabaseSchema extends DBSchema {
    files: {
        key: string,
        value: ModListDatabaseFile
    }
}

export interface ModEntry {
    pack: AssetPack | null,
    filename: string,
    preinstalled: boolean
}

export class ModManager {
    public static readonly SCHEMA_VERSION = 1;
    public readonly installedMods = new Array<ModEntry>;
    public readonly db: Promise<IDBPDatabase<ModListDatabaseSchema>>;

    public constructor(
        public readonly mainStorage: MainStorage,
        public readonly assets: Assets
    ) {
        this.db = openDB<ModListDatabaseSchema>("boxel_mods",
            ModManager.SCHEMA_VERSION, {
            upgrade(database, oldVersion, newVersion, transaction, event) {
                database.createObjectStore("files", {
                    keyPath: "filename"
                });
            },
        });
    }
    
    public async load() {
        const modListData = await this.mainStorage.get("mods");
        const modList = ModList.parse(modListData ?? {});

        this.installedMods.splice(0);

        for await(const filename of modList.mods) {
            const mod = await this.getModFromFilename(filename, false);
            this.installedMods.push(mod);
        }
    }

    public async save() {
        await this.mainStorage.set("mods", {
            mods: this.installedMods.filter(mod => !mod.preinstalled).map(mod => mod.filename)
        } as ModList);
    }

    public async updateInstalledPacks() {
        this.assets.clearPacks();
        for(const mod of this.installedMods) {
            if(mod.pack == null) {
                console.warn("Cannot install pack " + mod.filename + " (missing)");
            } else {
                console.log("Installing " + mod.pack.descriptor.name);
                this.assets.addPack(mod.pack);
            }
        }
    }

    private async getModFromFilename(filename: string, preinstalled: boolean): Promise<ModEntry> {
        const db = await this.db;
        const view = await db.get("files", filename);

        if(view == null) {
            return { filename, pack: null, preinstalled };
        }

        const type = mimetics.parse(view.file, filename)?.mime ?? "application/octet-stream";
        const blob = new Blob([ view.file ], { type });

        const pack = await AssetPack.fromBlob(blob);
        return { filename, pack, preinstalled };
    }

    public async updateFile(oldFilename: string, newFilename: string, blob: Blob) {
        const oldIndex = this.installedMods.findIndex(mod => mod.filename == oldFilename);
        const oldMod = this.installedMods[oldIndex];

        const modEntry = {
            filename: newFilename, preinstalled: oldMod?.preinstalled ?? false,
            pack: await AssetPack.fromBlob(blob)
        }

        if(oldIndex != -1) {
            this.installedMods.splice(oldIndex, 1, modEntry);
        } else {
            this.installedMods.push(modEntry);
        }
    }

    public async addModFile(filename: string, pack: AssetPack, preinstalled: boolean) {
        const db = await this.db;

        const existingFiles = await db.getAllKeys("files");

        let newFilename = filename;

        let i = 0;
        while(existingFiles.includes(newFilename)) {
            const name = filename.split(".");
            const extension = name.pop();

            i++;
            newFilename = name.join(".") + " (" + i + ")." + extension;
        }

        if(!preinstalled) {
            const arrayBuffer = await pack.source.arrayBuffer();

            const transaction = db.transaction("files", "readwrite", { durability: "strict" });
            await transaction.objectStore("files").put({
                filename, file: arrayBuffer
            });
        }
        const modEntry = { filename, preinstalled, pack };
        if(preinstalled) {
            const firstManualModIndex = this.installedMods.findIndex(mod => !mod.preinstalled);

            this.installedMods.push(modEntry, ...this.installedMods.splice(firstManualModIndex));
        } else {
            this.installedMods.push(modEntry);
        }
    }

    public async deleteMod(filename: string) {
        const modIndex = this.installedMods.findIndex(mod => mod.filename == filename);
        if(modIndex == -1) return;

        this.installedMods.splice(modIndex, 1);
    }
}