import { BlobReader, BlobWriter, TextWriter, ZipReader, type FileEntry } from "@zip.js/zip.js";
import { JsonhReader } from "jsonh-ts";
import type { DataDrivenJson } from "../data/dataDrivenJson";

export class Assets {
    public readonly textureRegistry = new Map<string, ImageBitmap>;
    public readonly blockRegistry = new Map<string, DataDrivenJson.Block>;
    public readonly blockModelRegistry = new Map<string, DataDrivenJson.BlockStateModel>;
    public readonly eventSheetRegistry = new Map<string, DataDrivenJson.EventSheet>;
    public readonly inventoryGuiTypeRegistry = new Map<string, DataDrivenJson.InventoryGuiType>;

    private readonly fileHandlers: Map<RegExp, (entry: FileEntry, ...groups: string[]) => Promise<void>> = new Map([
        [
            /^assets\/([^\/]+)\/texture\/(.*\.(?:(png)|(jpe?g)|(bmp)|(gif)|(webp)))$/,
            async (entry: FileEntry, namespace: string, name: string) => {
                const data = await entry.getData(new BlobWriter);
                const image = await createImageBitmap(data);
                this.textureRegistry.set(namespace + ":" + name, image);
            }
        ],
        [
            /^assets\/[^\/]+\/block\/.*\.jsonh?$/,
            async (entry: FileEntry) => {
                const data = await entry.getData(new TextWriter);
                const json = JsonhReader.parseElementFromString<DataDrivenJson.Block>(data).value;
                this.blockRegistry.set(json.id, json);
            }
        ],
        [
            /^assets\/[^\/]+\/block_model\/.*\.jsonh?$/,
            async (entry: FileEntry) => {
                const data = await entry.getData(new TextWriter);
                const json = JsonhReader.parseElementFromString<DataDrivenJson.BlockStateModel>(data).value;
                this.blockModelRegistry.set(json.id!, json);
            }
        ],
        [
            /^assets\/[^\/]+\/event\/.*\.jsonh?$/,
            async (entry: FileEntry) => {
                const data = await entry.getData(new TextWriter);
                const json = JsonhReader.parseElementFromString<DataDrivenJson.EventSheet>(data).value;
                this.eventSheetRegistry.set(json.id!, json);
            }
        ],
        [
            /^assets\/[^\/]+\/ui\/.*\.jsonh?$/,
            async (entry: FileEntry) => {
                const data = await entry.getData(new TextWriter);
                const json = JsonhReader.parseElementFromString<DataDrivenJson.InventoryGuiType>(data).value;
                this.inventoryGuiTypeRegistry.set(json.id!, json);
            }
        ]
    ]);

    public async loadPack(blob: Blob) {
        const zipFileReader = new BlobReader(blob);
        const reader = new ZipReader(zipFileReader);

        const entries = await reader.getEntries();

        for await(const entry of entries) {
            if(entry.directory) continue;
            
            for(const [ regex, handler ] of this.fileHandlers.entries()) {
                const groups = regex.exec(entry.filename);

                if(groups) {
                    try {
                        await handler(entry, ...groups.slice(1))
                    } catch(e) {
                        throw new Error("Failed to read file " + entry.filename, { cause: e });
                    };
                    break;
                }
            }
        }
    }
}