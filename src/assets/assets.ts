import { KeyedRegistry } from "objectregistry";
import { TextureLoader, type LoadingManager, type Texture } from "three";
import { TextureAtlas } from "./textureAtlas";

export interface TextureSource {
    load(loadingManager: LoadingManager): Promise<Texture>;
    toString(): string;
}

export class URLTextureSource implements TextureSource {
    public constructor(
        public readonly url: string
    ) {}

    public async load(loadingManager: LoadingManager) {
        const textureLoader = new TextureLoader(loadingManager);

        return await textureLoader.loadAsync(this.url);
    }

    public toString(): string {
        return `{URLTextureSource url=${this.url}}`;
    }
}

export class Assets {
    public readonly textureRegistry = new KeyedRegistry<TextureSource, string>;

    public getURLTextureSource(url: string) {
        let textureSource = this.textureRegistry.get(url);
        if(textureSource != null) return textureSource;

        textureSource = new URLTextureSource(url);
        this.textureRegistry.register(url, textureSource);

        return textureSource;
    }

    public async loadTextures(loadingManager: LoadingManager) {
        const atlas = new TextureAtlas();

        for await(const [ id, textureSource ] of this.textureRegistry.entries()) {
            atlas.addTexture(id, await textureSource.load(loadingManager));
        }

        atlas.pack();
    }
}