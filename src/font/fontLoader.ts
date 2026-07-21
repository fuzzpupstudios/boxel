import type { RawCharData } from "pixi.js";
import { BitmapFont, Cache, Texture } from "pixi.js";

export interface FontPage {
    pageTexture: Texture;
    characterByteStart: number;
}

export class FontLoader {
    public readonly pages = new Array<FontPage>;
    public constructor(
        public readonly fontName: string
    ) { }

    public addPage(page: FontPage) {
        this.pages.push(page);
    }

    public load() {
        const chars: Record<string, RawCharData> = {};

        for (let pageIndex = 0; pageIndex < this.pages.length; pageIndex++) {
            const page = this.pages[pageIndex];
            if (!page) {
                continue;
            }

            const pageCharacterStart = page.characterByteStart;
            const pageImageData = this.getPageImageData(page.pageTexture);
            const cellSize = 16;

            for (let row = 0; row < 16; row++) {
                for (let column = 0; column < 16; column++) {
                    const characterCode = pageCharacterStart + row * 16 + column;
                    const letter = String.fromCharCode(characterCode);
                    const cellX = column * cellSize;
                    const cellY = row * cellSize;
                    const bounds = this.findOpaqueBounds(pageImageData, cellX, cellY, cellSize);
                    const hasOpaquePixels = bounds.width > 0 && bounds.height > 0;
                    const xAdvance = hasOpaquePixels
                        ? bounds.width + 2
                        : Math.floor(cellSize / 2);

                    chars[letter] = {
                        id: characterCode,
                        page: pageIndex,
                        x: hasOpaquePixels ? bounds.x : cellX,
                        y: hasOpaquePixels ? bounds.y : cellY,
                        width: hasOpaquePixels ? bounds.width : 1,
                        height: hasOpaquePixels ? bounds.height : 1,
                        xOffset: 0,
                        yOffset: hasOpaquePixels ? bounds.y - cellY : 0,
                        xAdvance,
                        letter,
                        kerning: {},
                    };
                }
            }
        }

        const bitmapFont = new BitmapFont({
            data: {
                baseLineOffset: 1,
                chars,
                pages: this.pages.map((_, index) => ({
                    id: index,
                    file: `${this.fontName}-${index}`,
                })),
                lineHeight: 16,
                fontSize: 16,
                fontFamily: this.fontName,
            },
            textures: this.pages.map((page) => page.pageTexture),
        }, this.fontName);

        Cache.set(`${this.fontName}-bitmap`, bitmapFont);
    }

    private getPageImageData(pageTexture: Texture) {
        const source = pageTexture.source.resource as CanvasImageSource;
        const width = pageTexture.source.pixelWidth;
        const height = pageTexture.source.pixelHeight;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("[FontLoader] Failed to create 2D canvas context.");
        }

        context.clearRect(0, 0, width, height);
        context.drawImage(source, 0, 0, width, height);

        return context.getImageData(0, 0, width, height);
    }

    private findOpaqueBounds(imageData: ImageData, cellX: number, cellY: number, cellSize: number) {
        let minX = cellSize;
        let minY = cellSize;
        let maxX = -1;
        let maxY = -1;
        const { data, width } = imageData;

        for (let y = 0; y < cellSize; y++) {
            for (let x = 0; x < cellSize; x++) {
                const alpha = data[((cellY + y) * width + (cellX + x)) * 4 + 3];
                if (alpha === 0) {
                    continue;
                }

                if (x < minX) {
                    minX = x;
                }
                if (y < minY) {
                    minY = y;
                }
                if (x > maxX) {
                    maxX = x;
                }
                if (y > maxY) {
                    maxY = y;
                }
            }
        }

        if (maxX < minX || maxY < minY) {
            return {
                x: cellX,
                y: cellY,
                width: 0,
                height: 0,
            };
        }

        return {
            x: cellX + minX,
            y: cellY + minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
        };
    }
}