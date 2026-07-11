import { BlobReader, BlobWriter, TextWriter, ZipReader, type FileEntry } from "@zip.js/zip.js";
import { JsonhReader } from "jsonh-ts";
import type { DataDrivenJson } from "../data/dataDrivenJson";

export class Assets {
    public readonly textureRegistry = new Map<string, ImageBitmap>;
    public readonly jsonTemplatesRegistry = new Map<string, DataDrivenJson.JsonTemplate>;
    public readonly blockRegistry = new Map<string, DataDrivenJson.Block & DataDrivenJson.TemplateApplicable>;
    public readonly blockModelRegistry = new Map<string, DataDrivenJson.BlockStateModel & DataDrivenJson.TemplateApplicable>;
    public readonly eventSheetRegistry = new Map<string, DataDrivenJson.EventSheet & DataDrivenJson.TemplateApplicable>;
    public readonly inventoryGuiTypeRegistry = new Map<string, DataDrivenJson.InventoryGuiType & DataDrivenJson.TemplateApplicable>;

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
        ],
        [
            /^assets\/[^\/]+\/json_template\/.*\.jsonh?$/,
            async (entry: FileEntry) => {
                const data = await entry.getData(new TextWriter);
                const json = JsonhReader.parseElementFromString<DataDrivenJson.JsonTemplate>(data).value;
                this.jsonTemplatesRegistry.set(json.id!, json);
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

    private applyTemplate(object: any, substitutions: Map<string, any>) {
        if(typeof object == "string") {
            const entries = [];

            let readingKey = false;
            let escape = false;
            let keyName = "";
            let text = "";
            for(let i = 0; i < object.length; i++) {
                escape = false;
                if(object[i] == "\\") {
                    escape = true;
                    i++;
                }
                if(!escape) {
                    if(object[i] == "$" && object[i + 1] == "{") {
                        readingKey = true;

                        if(text.length > 0) {
                            entries.push({ type: "text", value: text });
                            text = "";
                        }
                        i += 2;
                    }

                    if(object[i] == "}") {
                        readingKey = false;

                        entries.push({ type: "variable", value: keyName });
                        keyName = "";
                        i++;
                    }
                }

                if(i >= object.length) break;

                if(readingKey) {
                    keyName += object[i];
                } else {
                    text += object[i];
                }
            }
            if(keyName.length > 0) {
                entries.push({ type: "text", value: keyName });
            }
            if(text.length > 0) {
                entries.push({ type: "text", value: text });
            }

            if(entries.length == 1 && entries[0]!.type == "variable") {
                const substitution = substitutions.get(entries[0]!.value);

                object = substitution;
            } else {
                let formattedString = "";
                for(const entry of entries) {
                    if(entry.type == "text") {
                        formattedString += entry.value;
                    }
                    if(entry.type == "variable") {
                        formattedString += substitutions.get(entry.value);
                    }
                }

                object = formattedString;
            }
        }
        if(typeof object == "object") {
            if(object instanceof Array) {
                object = object.map(value => this.applyTemplate(value, substitutions));
            } else {
                const formattedObject: Record<string, any> = {};

                for(const [ key, value ] of Object.entries(object)) {
                    const formattedKey = `${this.applyTemplate(key, substitutions)}`;
                    const formattedValue = this.applyTemplate(value, substitutions);
                    formattedObject[formattedKey] = formattedValue;
                }

                object = formattedObject;
            }
        }
        return object;
    }

    public processTemplates() {
        const registries: Map<string, DataDrivenJson.TemplateApplicable>[] = [
            this.blockRegistry,
            this.blockModelRegistry,
            this.eventSheetRegistry,
            this.inventoryGuiTypeRegistry
        ];

        for(const registry of registries) {
            for(const [ key, value ] of registry) {
                if(value.template == null) continue;

                try {
                    const template = this.jsonTemplatesRegistry.get(value.template.id);
                    if(template == null) throw new ReferenceError(
                        "Cannot find template " + value.template.id);
                    
                    const substitutions = new Map(Object.entries(value.template.arguments));

                    for(const parameterName of Object.keys(template.parameters)) {
                        if(substitutions.has(parameterName)) continue;

                        throw new Error("Parameter " + parameterName + " must be defined");
                    }
        
                    const applied = this.applyTemplate(template.json, substitutions);
                    registry.set(key, applied);
                } catch(e) {
                    throw new Error("Error applying template " + value.template.id +
                        " to " + key, { cause: e });
                }
            }
        }
    }
}