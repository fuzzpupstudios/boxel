import { JsonhReader } from "jsonh-ts";
import { AudioContext as ThreeAudioContext } from "three";
import z from "zod";
import type { AssetPack } from "./assetPack";
import { DataDrivenJson } from "./dataDrivenJson";

// Before processTemplates() runs, a templated file only has to provide `id` + `template`;
// the rest of the shape is filled in once the referenced template is applied.
const TemplateStub = z.object({
    id: z.string(),
    template: DataDrivenJson.TemplateApplicable.shape.template.unwrap(),
});

const TemplatableBlock = z.union([ DataDrivenJson.Block, TemplateStub ]);
const TemplatableBlockStateModel = z.union([ DataDrivenJson.BlockStateModel, TemplateStub ]);
const TemplatableEventSheet = z.union([ DataDrivenJson.EventSheet, TemplateStub ]);
const TemplatableItem = z.union([ DataDrivenJson.Item, TemplateStub ]);
const TemplatableGuiType = z.union([ DataDrivenJson.GuiType, TemplateStub ]);

export class Assets {
    public readonly assetPacks = new Array<AssetPack>;
    public readonly textureRegistry = new Map<string, ImageBitmap>;
    public readonly audioRegistry = new Map<string, AudioBuffer>;
    public readonly jsonTemplatesRegistry = new Map<string, DataDrivenJson.JsonTemplate>;
    public readonly blockRegistry = new Map<string, DataDrivenJson.Block & DataDrivenJson.TemplateApplicable>;
    public readonly blockModelRegistry = new Map<string, DataDrivenJson.BlockStateModel & DataDrivenJson.TemplateApplicable>;
    public readonly eventSheetRegistry = new Map<string, DataDrivenJson.EventSheet & DataDrivenJson.TemplateApplicable>;
    public readonly itemRegistry = new Map<string, DataDrivenJson.Item & DataDrivenJson.TemplateApplicable>;
    public readonly guiTypeRegistry = new Map<string, DataDrivenJson.GuiType & DataDrivenJson.TemplateApplicable>;
    public readonly blockEntityTypeRegistry = new Map<string, DataDrivenJson.BlockEntityType & DataDrivenJson.TemplateApplicable>;
    public readonly lightChannelTypeRegistry = new Map<string, DataDrivenJson.LightChannelType & DataDrivenJson.TemplateApplicable>;

    private readonly fileHandlers: Map<RegExp, (blob: Blob, ...groups: string[]) => Promise<void>> = new Map([
        [
            /^([^\/]+)\/texture\/(.*\.(?:(png)|(jpe?g)|(bmp)|(gif)|(webp)))$/,
            async (blob: Blob, namespace: string, name: string) => {
                const image = await createImageBitmap(blob);
                this.textureRegistry.set(namespace + ":" + name, image);
            }
        ],
        [
            /^([^\/]+)\/sound\/(.*)\.(?:(wav)|(mp3)|(ogg)|(flac)|(m4a))$/,
            async (blob: Blob, namespace: string, name: string) => {
                const buffer = await blob.arrayBuffer();

                const audioContext = <AudioContext>ThreeAudioContext.getContext();
                const audioBuffer: AudioBuffer = await new Promise((res, rej) => {
                    audioContext.decodeAudioData(buffer, res, rej);
                });
                
                this.audioRegistry.set(namespace + ":" + name, audioBuffer);
            }
        ],
        [
            /^[^\/]+\/block\/.*\.json[ch]?$/,
            async (blob: Blob) => {
                const data = await blob.text();
                const json = TemplatableBlock.parse(JsonhReader.parseElementFromString(data).value);
                this.blockRegistry.set(json.id, json as DataDrivenJson.Block & DataDrivenJson.TemplateApplicable);
            }
        ],
        [
            /^[^\/]+\/block_model\/.*\.json[ch]?$/,
            async (blob: Blob) => {
                const data = await blob.text();
                const json = TemplatableBlockStateModel.parse(JsonhReader.parseElementFromString(data).value);
                this.blockModelRegistry.set(json.id!, json as DataDrivenJson.BlockStateModel & DataDrivenJson.TemplateApplicable);
            }
        ],
        [
            /^[^\/]+\/event\/.*\.json[ch]?$/,
            async (blob: Blob) => {
                const data = await blob.text();
                const json = TemplatableEventSheet.parse(JsonhReader.parseElementFromString(data).value);
                this.eventSheetRegistry.set(json.id!, json as DataDrivenJson.EventSheet & DataDrivenJson.TemplateApplicable);
            }
        ],
        [
            /^[^\/]+\/item\/.*\.json[ch]?$/,
            async (blob: Blob) => {
                const data = await blob.text();
                const json = TemplatableItem.parse(JsonhReader.parseElementFromString(data).value);
                this.itemRegistry.set(json.id, json as DataDrivenJson.Item & DataDrivenJson.TemplateApplicable);
            }
        ],
        [
            /^[^\/]+\/block_entity\/.*\.json[ch]?$/,
            async (blob: Blob) => {
                const data = await blob.text();
                const json = DataDrivenJson.BlockEntityType.parse(JsonhReader.parseElementFromString(data).value);
                this.blockEntityTypeRegistry.set(json.id, json);
            }
        ],
        [
            /^[^\/]+\/ui\/.*\.json[ch]?$/,
            async (blob: Blob) => {
                const data = await blob.text();
                const j = JsonhReader.parseElementFromString(data).value;
                const json = TemplatableGuiType.parse(j);
                this.guiTypeRegistry.set(json.id, json as DataDrivenJson.GuiType & DataDrivenJson.TemplateApplicable);
            }
        ],
        [
            /^[^\/]+\/light\/.*\.json[ch]?$/,
            async (blob: Blob) => {
                const data = await blob.text();
                const json = DataDrivenJson.LightChannelType.parse(JsonhReader.parseElementFromString(data).value);
                this.lightChannelTypeRegistry.set(json.id, json);
            }
        ],
        [
            /^[^\/]+\/json_template\/.*\.json[ch]?$/,
            async (blob: Blob) => {
                const data = await blob.text();
                const json = DataDrivenJson.JsonTemplate.parse(JsonhReader.parseElementFromString(data).value);
                this.jsonTemplatesRegistry.set(json.id, json);
            }
        ]
    ]);

    public clearPacks() {
        this.assetPacks.splice(0);
    }
    public addPack(pack: AssetPack) {
        this.assetPacks.push(pack);
    }
    public removePack(pack: AssetPack) {
        this.assetPacks.splice(this.assetPacks.indexOf(pack), 1);
    }

    public async reload() {
        this.textureRegistry.clear();
        this.audioRegistry.clear();
        this.jsonTemplatesRegistry.clear();
        this.blockRegistry.clear();
        this.blockModelRegistry.clear();
        this.eventSheetRegistry.clear();
        this.itemRegistry.clear();
        this.guiTypeRegistry.clear();
        this.blockEntityTypeRegistry.clear();
        this.lightChannelTypeRegistry.clear();

        for await(const pack of this.assetPacks) {
            await this.applyPack(pack);
        }

        this.processTemplates();
    }

    private async applyPack(pack: AssetPack) {
        for await(const [ filename, blob ] of pack.files.entries()) {
            for(const [ regex, handler ] of this.fileHandlers.entries()) {
                const groups = regex.exec(filename);

                if(groups) {
                    try {
                        await handler(blob, ...groups.slice(1))
                    } catch(e) {
                        throw new Error("Failed to read file " + filename, { cause: e });
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

    private processTemplates() {
        const registries: [ Map<string, DataDrivenJson.TemplateApplicable>, z.ZodType<any> ][] = [
            [ this.blockRegistry, TemplatableBlock ],
            [ this.blockModelRegistry, TemplatableBlockStateModel ],
            [ this.eventSheetRegistry, TemplatableEventSheet ],
            [ this.guiTypeRegistry, TemplatableGuiType ],
            [ this.itemRegistry, TemplatableItem ],
        ];

        for(const [ registry, schema ] of registries) {
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

                    const applied = schema.parse(this.applyTemplate(template.json, substitutions));
                    registry.set(key, applied);
                } catch(e) {
                    throw new Error("Error applying template " + value.template.id +
                        " to " + key, { cause: e });
                }
            }
        }
    }

    public getTextureOrThrow(textureId: string) {
        const texture = this.textureRegistry.get(textureId);
        if(texture == null) {
            throw new ReferenceError("Cannot find texture with id " + textureId);
        }

        return texture;
    }
}