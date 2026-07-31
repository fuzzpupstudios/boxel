import { Matrix3, Matrix4, Vector2, Vector3 } from "three";
import { Assets } from "../../data/assets";
import { DataDrivenJson } from "../../data/dataDrivenJson";
import type { TextureAtlas } from "../../data/textureAtlas";
import type { TileMesh } from "../../rendering/chunkMesher";
import { parseModel } from "../jsonParseUtils";
import { blockTransformRegistry } from "../transform/blockTransformRegistry";
import { BlockModelFace } from "./face";

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

    public aoCastWeight?: number;

    public static parseJson(json: DataDrivenJson.BlockStateModel, assets: Assets, defaultModel?: BlockModel): BlockModel {
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

        if(defaultModel != null) {
            this.includeModel(model, defaultModel.clone());
        }
        for(const include of includes) {
            const parsedModel = parseModel(include.model, assets);
            this.includeModel(model, parsedModel, include.transforms);
        }

        model.occludeNorth = json.occludeNorth ?? json.occlude ?? model.occludeNorth!;
        model.occludeEast = json.occludeEast ?? json.occlude ?? model.occludeEast!;
        model.occludeSouth = json.occludeSouth ?? json.occlude ?? model.occludeSouth!;
        model.occludeWest = json.occludeWest ?? json.occlude ?? model.occludeWest!;
        model.occludeUp = json.occludeUp ?? json.occlude ?? model.occludeUp!;
        model.occludeDown = json.occludeDown ?? json.occlude ?? model.occludeDown!;
        model.aoCastWeight = json.aoCastWeight ?? model.aoCastWeight!;

        for(const cuboid of json.cuboids ?? []) {
            if(cuboid.north) {
                const face = BlockModelFace.parseJson(
                    this.parseFace(cuboid.north),
                    new Vector3(cuboid.to[0], cuboid.from[1], cuboid.from[2]),
                    new Vector2(cuboid.to[0] - cuboid.from[0], cuboid.to[1] - cuboid.from[1]),
                    new Vector3(0, 0, -1)
                );
                model.north.push(face);
            }
            if(cuboid.east) {
                const face = BlockModelFace.parseJson(
                    this.parseFace(cuboid.east),
                    new Vector3(cuboid.to[0], cuboid.from[1], cuboid.to[2]),
                    new Vector2(cuboid.to[2] - cuboid.from[2], cuboid.to[1] - cuboid.from[1]),
                    new Vector3(1, 0, 0)
                );
                model.east.push(face);
            }
            if(cuboid.south) {
                const face = BlockModelFace.parseJson(
                    this.parseFace(cuboid.south),
                    new Vector3(cuboid.from[0], cuboid.from[1], cuboid.to[2]),
                    new Vector2(cuboid.to[0] - cuboid.from[0], cuboid.to[1] - cuboid.from[1]),
                    new Vector3(0, 0, 1)
                );
                model.south.push(face);
            }
            if(cuboid.west) {
                const face = BlockModelFace.parseJson(
                    this.parseFace(cuboid.west),
                    new Vector3(cuboid.from[0], cuboid.from[1], cuboid.from[2]),
                    new Vector2(cuboid.to[2] - cuboid.from[2], cuboid.to[1] - cuboid.from[1]),
                    new Vector3(-1, 0, 0)
                );
                model.west.push(face);
            }
            if(cuboid.up) {
                const face = BlockModelFace.parseJson(
                    this.parseFace(cuboid.up),
                    new Vector3(cuboid.from[0], cuboid.to[1], cuboid.to[2]),
                    new Vector2(cuboid.to[0] - cuboid.from[0], cuboid.to[2] - cuboid.from[2]),
                    new Vector3(0, 1, 0)
                );
                model.up.push(face);
            }
            if(cuboid.down) {
                const face = BlockModelFace.parseJson(
                    this.parseFace(cuboid.down),
                    new Vector3(cuboid.from[0], cuboid.from[1], cuboid.from[2]),
                    new Vector2(cuboid.to[0] - cuboid.from[0], cuboid.to[2] - cuboid.from[2]),
                    new Vector3(0, -1, 0)
                );
                model.down.push(face);
            }
        }

        for(const [ textureSlot, textureURI ] of Object.entries(json.textures ?? {})) {
            model.textureURIs.set(textureSlot, textureURI);
        }

        if(json.transforms != null) {
            this.applyTransforms(model, json.transforms);
        }

        for(const face of model.faces()) {
            face.snapVertices();
        }

        model.correctVertexIndices();

        return model;
    }
    private static includeModel(
        baseModel: BlockModel,
        includedModel: BlockModel,
        transforms?: Record<string, any> | Record<string, any>[]
    ) {
        if(transforms != null) {
            this.applyTransforms(includedModel, transforms);
        }

        baseModel.occludeNorth = includedModel.occludeNorth ?? baseModel.occludeNorth!;
        baseModel.occludeEast = includedModel.occludeEast ?? baseModel.occludeEast!;
        baseModel.occludeSouth = includedModel.occludeSouth ?? baseModel.occludeSouth!;
        baseModel.occludeWest = includedModel.occludeWest ?? baseModel.occludeWest!;
        baseModel.occludeUp = includedModel.occludeUp ?? baseModel.occludeUp!;
        baseModel.occludeDown = includedModel.occludeDown ?? baseModel.occludeDown!;


        baseModel.north.push(...includedModel.north);
        baseModel.east.push(...includedModel.east);
        baseModel.south.push(...includedModel.south);
        baseModel.west.push(...includedModel.west);
        baseModel.up.push(...includedModel.up);
        baseModel.down.push(...includedModel.down);

        baseModel.aoCastWeight = includedModel.aoCastWeight ?? baseModel.aoCastWeight!;

        for(const [ textureSlot, textureURI ] of includedModel.textureURIs) {
            baseModel.textureURIs.set(textureSlot, textureURI);
        }
    }
    private static applyTransforms(parsedModel: BlockModel, transforms: Record<string, any> | Record<string, any>[]) {
        for(const transformList of transforms instanceof Array ? transforms : [ transforms ]) {
            for(const [ id, params ] of Object.entries(transformList)) {
                const TransformConstructor = blockTransformRegistry.get(id);
                try {
                    if(TransformConstructor == null) throw new ReferenceError("Unknown transform");

                    new TransformConstructor(params).transformModel(parsedModel);
                } catch(e) {
                    throw new Error("Failed to apply model transform " + id, { cause: e });
                }
            }
        }
    }
    private static parseFace(face: DataDrivenJson.BlockStateModelFace | string) {
        if(typeof face == "string") {
            face = DataDrivenJson.BlockStateModelFace.parse({
                texture: face
            });
        }
        return face;
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
            // Set the face's position on the texture atlas
            face.texture.setTexture(this.textureURIs.get(face.textureSlot)!);
            face.texture.setTextureAtlas(atlas);
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
        
        const offset = new Vector3(0, pivot.y, 1 - pivot.x);
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
        
        const offset = new Vector3(pivot.x, 0, 1 - pivot.y);
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

    public scale(scale: Vector3, anchor: Vector3, transformUVs: boolean) {
        const matrix4 = new Matrix4().makeScale(scale.x, scale.y, scale.z);

        this.translate(anchor.clone().multiplyScalar(-1), transformUVs);
        for(const face of this.faces()) {
            face.applyMatrix4(matrix4);
        }

        if(transformUVs) {
            for(const face of this.north) {
                face.applyMatrix3(new Matrix3().scale(1 / scale.x, 1 / scale.y));
            }
            for(const face of this.south) {
                face.applyMatrix3(new Matrix3().scale(1 / scale.x, 1 / scale.y));
            }
            for(const face of this.east) {
                face.applyMatrix3(new Matrix3().scale(1 / scale.z, 1 / scale.y));
            }
            for(const face of this.west) {
                face.applyMatrix3(new Matrix3().scale(1 / scale.z, 1 / scale.y));
            }
            for(const face of this.up) {
                face.applyMatrix3(new Matrix3().scale(1 / scale.x, 1 / scale.z));
            }
            for(const face of this.down) {
                face.applyMatrix3(new Matrix3().scale(1 / scale.x, 1 / scale.z));
            }
        }

        this.translate(anchor, transformUVs);
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

    public clone() {
        const model = new BlockModel;

        model.occludeNorth = this.occludeNorth!;
        model.occludeEast = this.occludeEast!;
        model.occludeSouth = this.occludeSouth!;
        model.occludeWest = this.occludeWest!;
        model.occludeUp = this.occludeUp!;
        model.occludeDown = this.occludeDown!;

        model.north.push(...this.north.map(face => face.clone()));
        model.east.push(...this.east.map(face => face.clone()));
        model.south.push(...this.south.map(face => face.clone()));
        model.west.push(...this.west.map(face => face.clone()));
        model.up.push(...this.up.map(face => face.clone()));
        model.down.push(...this.down.map(face => face.clone()));

        for(const [ alias, uri ] of this.textureURIs.entries()) {
            model.textureURIs.set(alias, uri);
        }

        model.aoCastWeight = this.aoCastWeight!;

        return model;
    }
}