import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { attribute, texture } from "three/tsl";
import { MathUtils, Node } from "three/webgpu";
import { blockStateRegistry } from "../block/blockRegistry";
import type { TextureAtlases } from "../boxel";
import type { TextureAtlasSlot } from "../data/textureAtlas";
import { itemRegistry } from "../item/itemRegistry";
import type { TileFace, TileMesh } from "../rendering/chunkMesher";

export class ItemHologramProvider {
    public readonly blockStateGeometries = new Map<string, BufferGeometry>;
    public readonly itemGeometries = new Map<string, BufferGeometry>;
    private readonly blockScale = 0.25;
    private readonly itemScale = 0.5;
    public readonly colorNode: Node<"vec4">;

    constructor(
        public readonly atlases: TextureAtlases,
    ) {
        for(const [ id, state ] of blockStateRegistry.entries()) {
            if(state.renderAsTexture == null) {
                const geometry = this.buildBlockStateGeometry(state.model.compile());
                this.blockStateGeometries.set(id, geometry);
            } else {
                const geometry = this.buildItemGeometry(state.renderAsTexture);
                this.itemGeometries.set(id, geometry);
            }
        }
        for(const [ id, item ] of itemRegistry.entries()) {
            const geometry = this.buildItemGeometry(item.texture);
            this.itemGeometries.set(id, geometry);
        }

        this.colorNode = this.createColorNode();
    }

    public *entries() {
        yield* this.blockStateGeometries.entries();
        yield* this.itemGeometries.entries();
    }

    private createColorNode() {
        const atlas = attribute("atlas", "float" as const);
        const color = atlas.equal(0).select(
            texture(this.atlases.item.threeTexture),
            texture(this.atlases.block.threeTexture)
        );
        
        return color;
    }

    private buildItemGeometry(textureSlot: TextureAtlasSlot) {
        const image = textureSlot.imageBitmap;
        
        if(image == null) return new BufferGeometry;

        const canvas = new OffscreenCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);


        const vertices = new Array<number>;
        const normals = new Array<number>;
        const uvs = new Array<number>;
        const indices = new Array<number>;
        const atlas = new Array<number>;
        let vertexCount = 0;

        const alpha = (x: number, y: number) => {
            if(x < 0 || y < 0) return 0;
            if(x >= image.width || y >= image.height) return 0;

            return imageData.data[(x + (image.height - 1 - y) * image.width) * 4 + 3]!;
        }

        const addUV = (x: number, y: number) => {
            uvs.push(
                MathUtils.mapLinear(x, 0, image.width, textureSlot.box2.min.x, textureSlot.box2.max.x),
                MathUtils.mapLinear(y, 0, image.height, textureSlot.box2.max.y, textureSlot.box2.min.y)
            );
        }

        for(let x = 0; x < image.width; x++) {
            let addFaceWest = false;
            let addFaceEast = false;

            for(let y = 0; y < image.height; y++) {
                if(alpha(x, y) && !alpha(x - 1, y)) {
                    addFaceWest = true;
                }
                if(alpha(x, y) && !alpha(x + 1, y)) {
                    addFaceEast = true;
                }
            }

            if(addFaceWest) {
                vertices.push(x, 0, 0);
                vertices.push(x, image.height, 0);
                vertices.push(x, image.height, 1);
                vertices.push(x, 0, 1);

                normals.push(-1, 0, 0);
                normals.push(-1, 0, 0);
                normals.push(-1, 0, 0);
                normals.push(-1, 0, 0);

                addUV(x + 0.5, 0);
                addUV(x + 0.5, image.height);
                addUV(x + 0.5, image.height);
                addUV(x + 0.5, 0);

                atlas.push(0, 0, 0, 0);

                indices.push(
                    vertexCount + 0, vertexCount + 3, vertexCount + 2,
                    vertexCount + 2, vertexCount + 1, vertexCount + 0,
                );

                vertexCount += 4;
            }
            if(addFaceEast) {
                vertices.push(x + 1, 0, 0);
                vertices.push(x + 1, image.height, 0);
                vertices.push(x + 1, image.height, 1);
                vertices.push(x + 1, 0, 1);

                normals.push(1, 0, 0);
                normals.push(1, 0, 0);
                normals.push(1, 0, 0);
                normals.push(1, 0, 0);

                addUV(x + 0.5, 0);
                addUV(x + 0.5, image.height);
                addUV(x + 0.5, image.height);
                addUV(x + 0.5, 0);

                atlas.push(0, 0, 0, 0);

                indices.push(
                    vertexCount + 2, vertexCount + 3, vertexCount + 0,
                    vertexCount + 0, vertexCount + 1, vertexCount + 2,
                );

                vertexCount += 4;
            }
        }

        for(let y = 0; y < image.height; y++) {
            let addFaceUp = false;
            let addFaceDown = false;

            for(let x = 0; x < image.width; x++) {
                if(alpha(x, y) && !alpha(x, y + 1)) {
                    addFaceUp = true;
                }
                if(alpha(x, y) && !alpha(x, y - 1)) {
                    addFaceDown = true;
                }
            }

            if(addFaceUp) {
                vertices.push(0, y + 1, 1);
                vertices.push(0, y + 1, 0);
                vertices.push(image.width, y + 1, 0);
                vertices.push(image.width, y + 1, 1);

                normals.push(0, 1, 0);
                normals.push(0, 1, 0);
                normals.push(0, 1, 0);
                normals.push(0, 1, 0);

                addUV(0, y + 0.5);
                addUV(0, y + 0.5);
                addUV(image.width, y + 0.5);
                addUV(image.width, y + 0.5);

                atlas.push(0, 0, 0, 0);

                indices.push(
                    vertexCount + 0, vertexCount + 3, vertexCount + 2,
                    vertexCount + 2, vertexCount + 1, vertexCount + 0,
                );

                vertexCount += 4;
            }
            if(addFaceDown) {
                vertices.push(0, y, 1);
                vertices.push(0, y, 0);
                vertices.push(image.width, y, 0);
                vertices.push(image.width, y, 1);

                normals.push(0, 1, 0);
                normals.push(0, 1, 0);
                normals.push(0, 1, 0);
                normals.push(0, 1, 0);

                addUV(0, y + 0.5);
                addUV(0, y + 0.5);
                addUV(image.width, y + 0.5);
                addUV(image.width, y + 0.5);

                atlas.push(0, 0, 0, 0);

                indices.push(
                    vertexCount + 2, vertexCount + 3, vertexCount + 0,
                    vertexCount + 0, vertexCount + 1, vertexCount + 2,
                );

                vertexCount += 4;
            }
        }

        {
            vertices.push(0, 0, 1);
            vertices.push(0, image.height, 1);
            vertices.push(image.width, image.height, 1);
            vertices.push(image.width, 0, 1);

            normals.push(0, 0, 1);
            normals.push(0, 0, 1);
            normals.push(0, 0, 1);
            normals.push(0, 0, 1);

            addUV(0, 0);
            addUV(0, image.height);
            addUV(image.width, image.height);
            addUV(image.width, 0);

            atlas.push(0, 0, 0, 0);

            indices.push(
                vertexCount + 0, vertexCount + 3, vertexCount + 2,
                vertexCount + 2, vertexCount + 1, vertexCount + 0,
            );

            vertexCount += 4;
        }

        {
            vertices.push(0, 0, 0);
            vertices.push(0, image.height, 0);
            vertices.push(image.width, image.height, 0);
            vertices.push(image.width, 0, 0);

            normals.push(0, 0, 1);
            normals.push(0, 0, 1);
            normals.push(0, 0, 1);
            normals.push(0, 0, 1);

            addUV(0, 0);
            addUV(0, image.height);
            addUV(image.width, image.height);
            addUV(image.width, 0);

            atlas.push(0, 0, 0, 0);

            indices.push(
                vertexCount + 2, vertexCount + 3, vertexCount + 0,
                vertexCount + 0, vertexCount + 1, vertexCount + 2,
            );

            vertexCount += 4;
        }

        const geometry = new BufferGeometry;
        geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
        geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
        geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
        geometry.setAttribute("atlas", new Float32BufferAttribute(atlas, 1));

        geometry.setIndex(indices);

        const zScale = 1 / Math.max(image.width, image.height);
        geometry.scale(1 / image.width, 1 / image.height, zScale);
        geometry.translate(-0.5, -0.5, zScale * -0.5);

        geometry.scale(this.itemScale, this.itemScale, this.itemScale);

        return geometry;
    }

    private buildBlockStateGeometry(model: TileMesh) {
        const vertices = new Array<number>;
        const normals = new Array<number>;
        const uvs = new Array<number>;
        const indices = new Array<number>;
        const atlas = new Array<number>;

        let vertexCount = 0;

        const addFace = (face: TileFace, normal: Vector3) => {
            vertices.push(face.x0 - 0.5, face.y0 - 0.5, face.z0 - 0.5);
            vertices.push(face.x1 - 0.5, face.y1 - 0.5, face.z1 - 0.5);
            vertices.push(face.x2 - 0.5, face.y2 - 0.5, face.z2 - 0.5);
            vertices.push(face.x3 - 0.5, face.y3 - 0.5, face.z3 - 0.5);

            uvs.push(face.u0, face.v0);
            uvs.push(face.u1, face.v1);
            uvs.push(face.u2, face.v2);
            uvs.push(face.u3, face.v3);

            normals.push(normal.x, normal.y, normal.z);
            normals.push(normal.x, normal.y, normal.z);
            normals.push(normal.x, normal.y, normal.z);
            normals.push(normal.x, normal.y, normal.z);

            atlas.push(1, 1, 1, 1);

            indices.push(
                vertexCount + 0, vertexCount + 3, vertexCount + 2,
                vertexCount + 2, vertexCount + 1, vertexCount + 0,
            );

            vertexCount += 4;
        }

        for(const face of model.north) addFace(face, new Vector3(0, 0, -1));
        for(const face of model.south) addFace(face, new Vector3(0, 0, 1));
        for(const face of model.east) addFace(face, new Vector3(1, 0, 0));
        for(const face of model.west) addFace(face, new Vector3(-1, 0, 0));
        for(const face of model.up) addFace(face, new Vector3(0, 1, 0));
        for(const face of model.down) addFace(face, new Vector3(0, -1, 0));

        const geometry = new BufferGeometry;
        geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
        geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
        geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
        geometry.setAttribute("atlas", new Float32BufferAttribute(atlas, 1));

        geometry.setIndex(indices);

        geometry.scale(this.blockScale, this.blockScale, this.blockScale);

        return geometry;
    }

    public getMesh(item: string): BufferGeometry {
        const itemGeometry = this.itemGeometries.get(item);
        if(itemGeometry != null) return itemGeometry;

        const blockStateGeometry = this.blockStateGeometries.get(item);
        if(blockStateGeometry != null) return blockStateGeometry;

        const defaultGeometry = this.blockStateGeometries.get("base:axes[default]");
        if(defaultGeometry == null) throw new ReferenceError("Cannot find base:axes[default] geometry");

        return defaultGeometry;
    }
}