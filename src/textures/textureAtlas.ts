import { Box2, NearestFilter, SRGBColorSpace, Texture, Vector2 } from "three";

interface AtlasSlot {
    id: string;
    texture: Texture;
    image: TexImageSource;
    width: number;
    height: number;
    padX: number;
    padY: number;
    paddedWidth: number;
    paddedHeight: number;
    x?: number;
    y?: number;
}

export class TextureAtlas {
    private readonly textures = new Map<string, Texture>();
    public readonly positions = new Map<string, Box2>();
    public packedTexture: Texture = new Texture();

    public addTexture(id: string, source: Texture) {
        this.textures.set(id, source);
    }

    public pack() {
        this.positions.clear();

        const slots: AtlasSlot[] = [];

        for(const [id, texture] of this.textures.entries()) {
            const image = texture.image as TexImageSource;
            const width = (image as any).width as number;
            const height = (image as any).height as number;

            if(!width || !height) {
                throw new Error(`Texture ${id} must have a loaded image with width and height.`);
            }

            const padX = Math.max(1, Math.ceil(width * 0.5));
            const padY = Math.max(1, Math.ceil(height * 0.5));
            const paddedWidth = width + padX * 2;
            const paddedHeight = height + padY * 2;

            slots.push({ id, texture, image, width, height, padX, padY, paddedWidth, paddedHeight });
        }

        if(!slots.length) {
            return;
        }

        slots.sort((a, b) => {
            const aSize = Math.max(a.paddedWidth, a.paddedHeight);
            const bSize = Math.max(b.paddedWidth, b.paddedHeight);
            if(bSize !== aSize) return bSize - aSize;
            return b.paddedHeight * b.paddedWidth - a.paddedHeight * a.paddedWidth;
        });

        const totalArea = slots.reduce((sum, slot) => sum + slot.paddedWidth * slot.paddedHeight, 0);
        const maxSide = Math.max(...slots.map(slot => Math.max(slot.paddedWidth, slot.paddedHeight)));
        let atlasSize = this.nextEven(Math.max(maxSide, Math.ceil(Math.sqrt(totalArea))));

        while (!this.tryPack(slots, atlasSize)) {
            atlasSize += 2;
        }

        const canvas = document.createElement("canvas") as HTMLCanvasElement;
        canvas.width = atlasSize;
        canvas.height = atlasSize;
        const ctx = canvas.getContext("2d");
        if(!ctx) {
            throw new Error("Failed to create canvas 2D context for texture atlas.");
        }

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, atlasSize, atlasSize);

        for(const slot of slots) {
            const x = slot.x! + slot.padX;
            const y = slot.y! + slot.padY;

            let image: TexImageSource;
            if(slot.image instanceof ImageData) {
                const converted = document.createElement("canvas");
                converted.width = slot.image.width;
                converted.height = slot.image.height;
                converted.getContext("2d")!.putImageData(slot.image, 0, 0);

                image = converted;
            } else {
                image = slot.image;
            }

            ctx.drawImage(image, 0, 0, slot.width, slot.height, x, y, slot.width, slot.height);

            ctx.drawImage(image, 0, 0, 1, slot.height, slot.x!, y, slot.padX, slot.height);
            ctx.drawImage(image, slot.width - 1, 0, 1, slot.height, x + slot.width, y, slot.padX, slot.height);

            ctx.drawImage(image, 0, 0, slot.width, 1, x, slot.y!, slot.width, slot.padY);
            ctx.drawImage(image, 0, slot.height - 1, slot.width, 1, x, y + slot.height, slot.width, slot.padY);

            ctx.drawImage(image, 0, 0, 1, 1, slot.x!, slot.y!, slot.padX, slot.padY);
            ctx.drawImage(image, slot.width - 1, 0, 1, 1, x + slot.width, slot.y!, slot.padX, slot.padY);
            ctx.drawImage(image, 0, slot.height - 1, 1, 1, slot.x!, y + slot.height, slot.padX, slot.padY);
            ctx.drawImage(image, slot.width - 1, slot.height - 1, 1, 1, x + slot.width, y + slot.height, slot.padX, slot.padY);

            const u0 = x / atlasSize;
            const v0 = 1 - (y + slot.height) / atlasSize;
            const u1 = (x + slot.width) / atlasSize;
            const v1 = 1 - y / atlasSize;

            this.positions.set(slot.id, new Box2(new Vector2(u0, v0), new Vector2(u1, v1)));
        }

        this.packedTexture = new Texture(canvas);
        this.packedTexture.magFilter = NearestFilter;
        this.packedTexture.colorSpace = SRGBColorSpace;

        this.packedTexture.generateMipmaps = false;
        this.packedTexture.mipmaps = [canvas, ...this.generateManualMipmaps(canvas, 4)];
        this.packedTexture.needsUpdate = true;

        canvas.toBlob(blob => console.log(URL.createObjectURL(blob!)));
    }

    private tryPack(slots: AtlasSlot[], atlasSize: number): boolean {
        let x = 0;
        let y = 0;
        let rowHeight = 0;

        for(const slot of slots) {
            if(x + slot.paddedWidth > atlasSize) {
                x = 0;
                y += rowHeight;
                rowHeight = 0;
            }

            if(y + slot.paddedHeight > atlasSize) {
                return false;
            }

            slot.x = x;
            slot.y = y;
            x += slot.paddedWidth;
            rowHeight = Math.max(rowHeight, slot.paddedHeight);
        }

        return true;
    }

    private generateManualMipmaps(canvas: HTMLCanvasElement, levels: number) {
        const width = canvas.width;
        const height = canvas.height;
        let prevCanvas = canvas;

        const mipmaps = new Array;
        for(let level = 1; level <= levels; level++) {
            const mipWidth = Math.max(1, width >> level);
            const mipHeight = Math.max(1, height >> level);
            const mipCanvas = document.createElement("canvas") as HTMLCanvasElement;
            mipCanvas.width = mipWidth;
            mipCanvas.height = mipHeight;
            const mipCtx = mipCanvas.getContext("2d");
            if(!mipCtx) break;

            mipCtx.imageSmoothingEnabled = true;
            mipCtx.clearRect(0, 0, mipWidth, mipHeight);
            mipCtx.drawImage(prevCanvas, 0, 0, prevCanvas.width, prevCanvas.height, 0, 0, mipWidth, mipHeight);

            mipmaps.push(mipCanvas);
            prevCanvas = mipCanvas;
        }

        return mipmaps;
    }

    private nextEven(value: number): number {
        return value + (value % 2);
    }
}
