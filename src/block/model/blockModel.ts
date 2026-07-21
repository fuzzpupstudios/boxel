import { Matrix3, Matrix4, Vector2, Vector3 } from "three";
import { Assets } from "../../data/assets";
import type { DataDrivenJson } from "../../data/dataDrivenJson";
import type { TextureAtlas } from "../../data/textureAtlas";
import type { TileMesh } from "../../rendering/chunkMesher";
import { parseModel } from "../jsonParseUtils";
import { BlockModelFace } from "./face";
import { blockModelTransforms } from "./transforms";

export class BlockModel {
    public occludeNorth?: boolean;
    public occludeEast?: boolean;
    public occludeSouth?: boolean;
    public occludeWest?: boolean;
    public occludeUp?: boolean;
    public occludeDown?: boolean;

    public north = new Array<BlockModelFace>;
    public east = new Array<BlockModelFace>;
    public south = new Array<BlockModelFace>;
    public west = new Array<BlockModelFace>;
    public up = new Array<BlockModelFace>;
    public down = new Array<BlockModelFace>;

    public textureURIs = new Map<string, string>;
    public textureSources = new Map<string, ImageBitmap>;

    public aoCastWeight?: number;

    public static parseJson(json: DataDrivenJson.BlockStateModel, assets: Assets): BlockModel {
        const includes = new Array<DataDrivenJson.BlockStateModelIncludeEntry>;

        for(const include of json.include instanceof Array ? json.include : [ json.include ]) {
            if(include == null) continue;

            let includeJson: DataDrivenJson.BlockStateModelIncludeEntry;
            if(typeof include == "string") {
                const model = assets.blockModelRegistry.get(include);

                if(model == null) {
                    throw new ReferenceError("Cannot find model " + include);
                }

                includeJson = {
                    model,
                    transforms: []
                }
            } else {
                includeJson = include;
            }
            includes.push(includeJson);
        }

        const model = new BlockModel;

        for(const include of includes) {
            const parsedModel = parseModel(include.model, assets);

            if(include.transforms != null) {
                for(const transforms of include.transforms instanceof Array ? include.transforms : [ include.transforms ]) {
                    for(const [ id, params ] of Object.entries(transforms)) {
                        const transform = blockModelTransforms[id];
                        if(transform == null) throw new ReferenceError("Unknown transform " + id);

                        transform(parsedModel, params);
                    }
                }
            }

            model.occludeNorth = parsedModel.occludeNorth ?? model.occludeNorth!;
            model.occludeEast = parsedModel.occludeEast ?? model.occludeEast!;
            model.occludeSouth = parsedModel.occludeSouth ?? model.occludeSouth!;
            model.occludeWest = parsedModel.occludeWest ?? model.occludeWest!;
            model.occludeUp = parsedModel.occludeUp ?? model.occludeUp!;
            model.occludeDown = parsedModel.occludeDown ?? model.occludeDown!;


            model.north.push(...parsedModel.north);
            model.east.push(...parsedModel.east);
            model.south.push(...parsedModel.south);
            model.west.push(...parsedModel.west);
            model.up.push(...parsedModel.up);
            model.down.push(...parsedModel.down);

            model.aoCastWeight = parsedModel.aoCastWeight ?? model.aoCastWeight!;


            for(const [ textureSlot, textureSource ] of parsedModel.textureSources) {
                model.textureSources.set(textureSlot, textureSource);
            }
            for(const [ textureSlot, textureURI ] of parsedModel.textureURIs) {
                model.textureURIs.set(textureSlot, textureURI);
            }
        }

        model.occludeNorth = json.occludeNorth ?? json.occlude ?? model.occludeNorth!;
        model.occludeEast = json.occludeEast ?? json.occlude ?? model.occludeEast!;
        model.occludeSouth = json.occludeSouth ?? json.occlude ?? model.occludeSouth!;
        model.occludeWest = json.occludeWest ?? json.occlude ?? model.occludeWest!;
        model.occludeUp = json.occludeUp ?? json.occlude ?? model.occludeUp!;
        model.occludeDown = json.occludeDown ?? json.occlude ?? model.occludeDown!;
        model.aoCastWeight = json.aoCastWeight ?? model.aoCastWeight!;


        model.north.push(...(json.north ?? []).map(json => BlockModelFace.parseJson(json, new Vector3(0, 0, -1))));
        model.east.push(...(json.east ?? []).map(json => BlockModelFace.parseJson(json, new Vector3(1, 0, 0))));
        model.south.push(...(json.south ?? []).map(json => BlockModelFace.parseJson(json, new Vector3(0, 0, 1))));
        model.west.push(...(json.west ?? []).map(json => BlockModelFace.parseJson(json, new Vector3(-1, 0, 0))));
        model.up.push(...(json.up ?? []).map(json => BlockModelFace.parseJson(json, new Vector3(0, 1, 0))));
        model.down.push(...(json.down ?? []).map(json => BlockModelFace.parseJson(json, new Vector3(0, -1, 0))));

        for(const [ textureSlot, textureURI ] of Object.entries(json.textures ?? {})) {
            const textureSource = assets.textureRegistry.get(textureURI);
            if(textureSource == null) {
                throw new ReferenceError("Texture " + textureURI + " doesn't exist");
            }

            model.textureSources.set(textureSlot, textureSource);
            model.textureURIs.set(textureSlot, textureURI);
        }

        for(const face of model.faces()) {
            face.snapVertices();
        }

        model.correctVertexIndices();

        return model;
    }

    public *faces() {
        yield* this.north;
        yield* this.east;
        yield* this.south;
        yield* this.west;
        yield* this.up;
        yield* this.down;
    }

    public setTextureAtlas(atlas: TextureAtlas) {
        for(const face of this.faces()) {
            // Look up the URI of the face's texture
            const textureURI = this.textureURIs.get(face.textureSlot) ?? "base:block/axes.png";

            // Find the position of the URI on the atlas
            const uv = atlas.positions.get(textureURI);
            if(uv == null) throw new ReferenceError(
                "Texture atlas position for " + textureURI + " not found");

            // Set the face's position on the texture atlas
            face.setTexturePosition(uv);
        }
    }

    public translate(offset: Vector3, transformUVs: boolean) {
        const matrix4 = new Matrix4().setPosition(offset);

        for(const face of this.faces()) {
            face.applyMatrix4(matrix4);
        }

        if(transformUVs) {
            for(const face of this.north) {
                face.applyMatrix3(new Matrix3().translate(offset.x, offset.y));
            }
            for(const face of this.south) {
                face.applyMatrix3(new Matrix3().translate(-offset.x, offset.y));
            }
            for(const face of this.east) {
                face.applyMatrix3(new Matrix3().translate(-offset.z, offset.y));
            }
            for(const face of this.west) {
                face.applyMatrix3(new Matrix3().translate(offset.z, offset.y));
            }
            for(const face of this.up) {
                face.applyMatrix3(new Matrix3().translate(offset.x, -offset.z));
            }
            for(const face of this.down) {
                face.applyMatrix3(new Matrix3().translate(-offset.x, offset.z));
            }
        }
    }

    public rotateX(count: number, pivot: Vector2, transformUVs: boolean) {
        if(count == 0) return;
        
        const offset = new Vector3(0, pivot.y, pivot.x);
        this.translate(offset.clone().multiplyScalar(-1), false);

        for(let i = 0; i < (count % 4 + 4) % 4; i++) {
            
            for(const face of this.faces()) {
                face.applyMatrix4(new Matrix4().makeRotationX(Math.PI * -0.5));
            }
                
            if(transformUVs) {
                for(const face of this.east) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * -0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                for(const face of this.west) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * 0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                for(const face of [...this.north, ...this.down]) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
            }

            [ this.occludeUp!, this.occludeNorth!, this.occludeDown!, this.occludeSouth! ] =
            [ this.occludeSouth!, this.occludeUp!, this.occludeNorth!, this.occludeDown! ];

            [ this.up, this.north, this.down, this.south ] =
            [ this.south, this.up, this.north, this.down ];
        }
        this.translate(offset, false);
    }

    public rotateY(count: number, pivot: Vector2, transformUVs: boolean) {
        if(count == 0) return;
        
        const offset = new Vector3(pivot.x, 0, pivot.y);
        this.translate(offset.clone().multiplyScalar(-1), false);
        
        for(let i = 0; i < (count % 4 + 4) % 4; i++) {
            for(const face of this.faces()) {
                face.applyMatrix4(new Matrix4().makeRotationY(Math.PI * -0.5));
            }
                
            if(transformUVs) {
                for(const face of this.up) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * 0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                for(const face of this.down) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * -0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
            }

            [ this.occludeNorth!, this.occludeEast!, this.occludeSouth!, this.occludeWest! ] =
            [ this.occludeWest!, this.occludeNorth!, this.occludeEast!, this.occludeSouth! ];

            [ this.north, this.east, this.south, this.west ] =
            [ this.west, this.north, this.east, this.south ];
        }
        this.translate(offset, false);
    }

    public rotateZ(count: number, pivot: Vector2, transformUVs: boolean) {
        if(count == 0) return;
        
        const offset = new Vector3(pivot.x, pivot.y);
        this.translate(offset.clone().multiplyScalar(-1), false);
        
        for(let i = 0; i < (count % 4 + 4) % 4; i++) {
            for(const face of this.faces()) {
                face.applyMatrix4(new Matrix4().makeRotationZ(Math.PI * -0.5));
            }
                
            if(transformUVs) {
                for(const face of this.north) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * -0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                for(const face of this.south) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * 0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                for(const face of [...this.west, ...this.east]) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
            }

            [ this.occludeUp!, this.occludeEast!, this.occludeDown!, this.occludeWest! ] =
            [ this.occludeWest!, this.occludeUp!, this.occludeEast!, this.occludeDown! ];

            [ this.up, this.east, this.down, this.west ] =
            [ this.west, this.up, this.east, this.down ];
        }
        this.translate(offset, false);
    }

    public correctVertexIndices() {
        for(const face of this.north) {
            if(face.v0.x < face.v3.x) [ face.v0, face.v3 ] = [ face.v3, face.v0 ];
            if(face.v1.x < face.v2.x) [ face.v1, face.v2 ] = [ face.v2, face.v1 ];
            if(face.v0.y > face.v1.y) [ face.v0, face.v1 ] = [ face.v1, face.v0 ];
            if(face.v3.y > face.v2.y) [ face.v3, face.v2 ] = [ face.v2, face.v3 ];
        }
        for(const face of this.south) {
            if(face.v0.x > face.v3.x) [ face.v0, face.v3 ] = [ face.v3, face.v0 ];
            if(face.v1.x > face.v2.x) [ face.v1, face.v2 ] = [ face.v2, face.v1 ];
            if(face.v0.y > face.v1.y) [ face.v0, face.v1 ] = [ face.v1, face.v0 ];
            if(face.v3.y > face.v2.y) [ face.v3, face.v2 ] = [ face.v2, face.v3 ];
        }
        for(const face of this.east) {
            if(face.v0.z < face.v3.z) [ face.v0, face.v3 ] = [ face.v3, face.v0 ];
            if(face.v1.z < face.v2.z) [ face.v1, face.v2 ] = [ face.v2, face.v1 ];
            if(face.v0.y > face.v1.y) [ face.v0, face.v1 ] = [ face.v1, face.v0 ];
            if(face.v3.y > face.v2.y) [ face.v3, face.v2 ] = [ face.v2, face.v3 ];
        }
        for(const face of this.west) {
            if(face.v0.z > face.v3.z) [ face.v0, face.v3 ] = [ face.v3, face.v0 ];
            if(face.v1.z > face.v2.z) [ face.v1, face.v2 ] = [ face.v2, face.v1 ];
            if(face.v0.y > face.v1.y) [ face.v0, face.v1 ] = [ face.v1, face.v0 ];
            if(face.v3.y > face.v2.y) [ face.v3, face.v2 ] = [ face.v2, face.v3 ];
        }
        for(const face of this.up) {
            if(face.v0.z < face.v1.z) [ face.v0, face.v1 ] = [ face.v1, face.v0 ];
            if(face.v3.z < face.v2.z) [ face.v3, face.v2 ] = [ face.v2, face.v3 ];
            if(face.v0.x > face.v3.x) [ face.v0, face.v3 ] = [ face.v3, face.v0 ];
            if(face.v1.x > face.v2.x) [ face.v1, face.v2 ] = [ face.v2, face.v1 ];
        }
        for(const face of this.down) {
            if(face.v0.x > face.v3.x) [ face.v0, face.v3 ] = [ face.v3, face.v0 ];
            if(face.v1.x > face.v2.x) [ face.v1, face.v2 ] = [ face.v2, face.v1 ];
            if(face.v0.z > face.v1.z) [ face.v0, face.v1 ] = [ face.v1, face.v0 ];
            if(face.v3.z > face.v2.z) [ face.v3, face.v2 ] = [ face.v2, face.v3 ];
        }
    }

    public compile(): TileMesh {
        let renderAnyWhenCulled = false;
        for(const face of this.faces()) {
            face.snapVertices();
            if(face.shouldCull()) continue;

            renderAnyWhenCulled = true;
        }

        this.correctVertexIndices();
        
        return {
            skipRender: Array.from(this.faces()).length == 0,
            renderAnyWhenCulled,

            occludeNorth: this.occludeNorth ?? true,
            occludeEast: this.occludeEast ?? true,
            occludeSouth: this.occludeSouth ?? true,
            occludeWest: this.occludeWest ?? true,
            occludeUp: this.occludeUp ?? true,
            occludeDown: this.occludeDown ?? true,

            north: this.north.map(face => face.compile()),
            east: this.east.map(face => face.compile()),
            south: this.south.map(face => face.compile()),
            west: this.west.map(face => face.compile()),
            up: this.up.map(face => face.compile()),
            down: this.down.map(face => face.compile()),

            aoCastWeight: this.aoCastWeight ?? 1
        }
    }
}