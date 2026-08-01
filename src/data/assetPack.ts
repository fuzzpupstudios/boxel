import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { JsonhReader } from "jsonh-ts";
import mimetics from "mimetics";
import z from "zod";

export type AssetPackDescriptor = z.infer<typeof AssetPackDescriptor>;
export const AssetPackDescriptor = z.object({
    name: z.string(),
    author: z.string().default("unknown"),
    version: z.string().default("0.0.1"),
    description: z.string().optional(),
    icon: z.string().default("base:ui/pack.png")
});

export class AssetPack {
    public static async fromBlob(blob: Blob) {
        const zipFileReader = new BlobReader(blob);
        const reader = new ZipReader(zipFileReader);

        const files = new Map<string, Blob>;

        for await(const entry of await reader.getEntries()) {
            if(entry.directory) continue;

            const arrayBuffer = await entry.arrayBuffer();
            const type = mimetics.parse(new Uint8Array(arrayBuffer),
                entry.filename)?.mime ?? "application/octet-stream";
            const blob = new Blob([ arrayBuffer ], { type });

            files.set(entry.filename, blob);
        }


        const filenames = Array.from(files.keys());;
        const weight = (string: string) => {
            let slashCount = 0;
            for(const char of string) {
                if(char == "/") slashCount++;
            }
            return string.length / (1e5 ** slashCount);
        }
        filenames.sort((a, b) => weight(a) - weight(b));

        let descriptor: AssetPackDescriptor | undefined;

        const modJsonFileRegex = /^\/?mod\.((hjson)|(json)|(jsonc)|(jsonh))$/;
        const assetFileRegex = /^\/?assets\/(.*)$/;
        
        for(const filename of filenames) {
            if(modJsonFileRegex.test(filename)) {
                const text = await files.get(filename)!.text();
                const json = JsonhReader.parseElementFromString(text);
                descriptor = AssetPackDescriptor.parse(json.value);
            }
        }

        if(descriptor == null) {
            throw new Error("mod.json could not be found");
        }

        const assetFiles = new Map<string, Blob>;
        for await(const [ filename, blob ] of files.entries()) {
            const assetPath = assetFileRegex.exec(filename);
            if(assetPath != null) {
                assetFiles.set(assetPath[1]!, blob);
            }
        }

        return new AssetPack(
            descriptor,
            assetFiles,
            blob
        );
    }

    public constructor(
        public readonly descriptor: AssetPackDescriptor,
        public readonly files: Map<string, Blob>,
        public readonly source: Blob
    ) {}
}