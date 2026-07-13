import { Euler, MathUtils, Matrix3, Matrix4, Quaternion, Vector2, Vector3, type Box2 } from "three";
import z from "zod";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { TileFace, TileMesh } from "../rendering/chunkMesher";
import { Assets } from "../textures/assets";
import type { TextureAtlas } from "../textures/textureAtlas";
import { parseModel } from "./jsonParseUtils";

const blockModelTransforms: Record<string, (model: BlockModel, params: any) => void> = {
    "rotateX": (model: BlockModel, params: any) => {
        const parsed = z.object({
            angle: z.int(),
            pivot: z.tuple([ z.number(), z.number() ]).default([ 0.5, 0.5 ]),
            transformUVs: z.boolean().default(false)
        }).or(z.number()).parse(params);

        let angle = 0;
        const pivot = new Vector2(0.5, 0.5);
        let transformUVs = false;

        if(typeof parsed == "number") {
            angle = parsed;
        } else {
            angle = parsed.angle;
            pivot.set(...parsed.pivot),
            transformUVs = parsed.transformUVs
        }

        model.rotateX(angle, pivot, transformUVs);
    },
    "rotateY": (model: BlockModel, params: any) => {
        const parsed = z.object({
            angle: z.int(),
            pivot: z.tuple([ z.number(), z.number() ]).default([ 0.5, 0.5 ]),
            transformUVs: z.boolean().default(false)
        }).or(z.number()).parse(params);

        let angle = 0;
        const pivot = new Vector2(0.5, 0.5);
        let transformUVs = false;

        if(typeof parsed == "number") {
            angle = parsed;
        } else {
            angle = parsed.angle;
            pivot.set(...parsed.pivot),
            transformUVs = parsed.transformUVs
        }

        model.rotateY(angle, pivot, transformUVs);
    },
    "rotateZ": (model: BlockModel, params: any) => {
        const parsed = z.object({
            angle: z.int(),
            pivot: z.tuple([ z.number(), z.number() ]).default([ 0.5, 0.5 ]),
            transformUVs: z.boolean().default(false)
        }).or(z.number()).parse(params);

        let angle = 0;
        const pivot = new Vector2(0.5, 0.5);
        let transformUVs = false;

        if(typeof parsed == "number") {
            angle = parsed;
        } else {
            angle = parsed.angle;
            pivot.set(...parsed.pivot),
            transformUVs = parsed.transformUVs
        }

        model.rotateZ(angle, pivot, transformUVs);
    },
    "translate": (model: BlockModel, params: any) => {
        const parsed = z.object({
            x: z.number().default(0),
            y: z.number().default(0),
            z: z.number().default(0),
            transformUVs: z.boolean().default(false)
        }).parse(params);

        model.translate(new Vector3(parsed.x, parsed.y, parsed.z), parsed.transformUVs);
    }
}

export class BlockModelVertex {
    public readonly xyz = new Vector3;
    public readonly uv = new Vector2;

    public set(
        x: number, y: number, z: number,
        u: number, v: number
    ) {
        this.xyz.set(x, y, z);
        this.uv.set(u, v);
    }
    public clone(): BlockModelVertex {
        const vertex = new BlockModelVertex;
        vertex.xyz.copy(this.xyz);
        vertex.uv.copy(this.uv);

        return vertex;
    }

    public get x() {
        return this.xyz.x;
    }
    public set x(x: number) {
        this.xyz.x = x;
    }
    public get y() {
        return this.xyz.y;
    }
    public set y(y: number) {
        this.xyz.y = y;
    }
    public get z() {
        return this.xyz.z;
    }
    public set z(z: number) {
        this.xyz.z = z;
    }

    public get u() {
        return this.uv.x;
    }
    public set u(u: number) {
        this.uv.x = u;
    }
    public get v() {
        return this.uv.y;
    }
    public set v(v: number) {
        this.uv.y = v;
    }

    public applyMatrix4(matrix: Matrix4) {
        this.xyz.applyMatrix4(matrix);
    }
    public applyMatrix3(matrix: Matrix3) {
        this.uv.applyMatrix3(matrix);
    }

    public snap(grid: number) {
        this.x = Math.round(this.x / grid) * grid;
        this.y = Math.round(this.y / grid) * grid;
        this.z = Math.round(this.z / grid) * grid;
    }
}

export class BlockModelFace {
    public v0 = new BlockModelVertex;
    public v1 = new BlockModelVertex;
    public v2 = new BlockModelVertex;
    public v3 = new BlockModelVertex;
    public rotation = 0;
    public lit = false;
    public textureSlot = "";
    public texturePosition: Box2 | null = null;

    public static parseJson(json: DataDrivenJson.BlockStateModelFace, normal: Vector3): BlockModelFace {
        const face = new BlockModelFace(normal);

        const [ x, y, z ] = json.pos;
        const [ width, height ] = json.size;
        const [ uvMinX, uvMinY, uvMaxX, uvMaxY ] = json.uv;


        const quaternion = new Quaternion();
        quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);

        const origin = new Vector3(x, y, z);
        face.v0.xyz.copy(new Vector3(0, 0).applyQuaternion(quaternion).add(origin));
        face.v1.xyz.copy(new Vector3(0, height).applyQuaternion(quaternion).add(origin));
        face.v2.xyz.copy(new Vector3(width, height).applyQuaternion(quaternion).add(origin));
        face.v3.xyz.copy(new Vector3(width, 0).applyQuaternion(quaternion).add(origin));

        let uv0 = new Vector2(uvMinX, uvMinY);
        let uv1 = new Vector2(uvMinX, uvMaxY);
        let uv2 = new Vector2(uvMaxX, uvMaxY);
        let uv3 = new Vector2(uvMaxX, uvMinY);

        if(json.rotation != null) {
            for(let i = 0; i < (json.rotation + 4) % 4; i++) {
                [ uv0, uv1, uv2, uv3 ] =
                [ uv1, uv2, uv3, uv0 ];
            }
        }
        face.v0.uv.copy(uv0);
        face.v1.uv.copy(uv1);
        face.v2.uv.copy(uv2);
        face.v3.uv.copy(uv3);
        
        face.textureSlot = json.texture;
        face.lit = json.lit ?? face.lit;

        return face;
    }

    public constructor(
        public readonly normal: Vector3
    ) {}
    
    public clone(): any {
        const face = new BlockModelFace(this.normal.clone());
        face.v0 = this.v0.clone();
        face.v1 = this.v1.clone();
        face.v2 = this.v2.clone();
        face.v3 = this.v3.clone();
        
        face.rotation = this.rotation;
        face.lit = this.lit;
        face.textureSlot = this.textureSlot;
        
        if(this.texturePosition != null) {
            face.texturePosition = this.texturePosition.clone();
        }

        return face;
    }

    public *vertices() {
        yield this.v0;
        yield this.v1;
        yield this.v2;
        yield this.v3;
    }

    public snapVertices(grid = 1/4096) {
        for(const vertex of this.vertices()) {
            vertex.snap(grid);
        }
    }

    public applyMatrix4(matrix: Matrix4) {
        this.normal.applyMatrix4(matrix.clone().extractRotation(new Matrix4)).normalize();

        for(const vertex of this.vertices()) {
            vertex.applyMatrix4(matrix);
        }
    }

    public applyMatrix3(matrix: Matrix3) {
        for(const vertex of this.vertices()) {
            vertex.applyMatrix3(matrix);
        }
    }

    public setTexturePosition(texturePosition: Box2) {
        this.texturePosition = texturePosition;
    }

    public shouldCull() {
        const planarX = this.v0.x == this.v1.x && this.v1.x == this.v2.x && this.v2.x == this.v3.x;
        const planarY = this.v0.y == this.v1.y && this.v1.y == this.v2.y && this.v2.y == this.v3.y;
        const planarZ = this.v0.z == this.v1.z && this.v1.z == this.v2.z && this.v2.z == this.v3.z;

        return (
            (this.normal.x === 1 && planarX && this.v0.x == 1) ||
            (this.normal.x === -1 && planarX && this.v0.x == 0) ||
            (this.normal.y === 1 && planarY && this.v0.y == 1) ||
            (this.normal.y === -1 && planarY && this.v0.y == 0) ||
            (this.normal.z === 1 && planarZ && this.v0.z == 1) ||
            (this.normal.z === -1 && planarZ && this.v0.z == 0)
        );
    }

    public compile(): TileFace {
        if(this.texturePosition == null)
            throw new ReferenceError("Texture position has not been defined");


        // Map the local uv coordinates of the face to the
        // position passed in via setTexturePosition()
        const minU = this.texturePosition.min.x;
        const minV = this.texturePosition.min.y;
        const maxU = this.texturePosition.max.x;
        const maxV = this.texturePosition.max.y;

        return {
            cull: this.shouldCull(),
            lit: this.lit,

            x0: this.v0.x, y0: this.v0.y, z0: this.v0.z,
            u0: MathUtils.mapLinear(this.v0.u, 0, 1, minU, maxU),
            v0: MathUtils.mapLinear(this.v0.v, 0, 1, minV, maxV),

            x1: this.v1.x, y1: this.v1.y, z1: this.v1.z,
            u1: MathUtils.mapLinear(this.v1.u, 0, 1, minU, maxU),
            v1: MathUtils.mapLinear(this.v1.v, 0, 1, minV, maxV),

            x2: this.v2.x, y2: this.v2.y, z2: this.v2.z,
            u2: MathUtils.mapLinear(this.v2.u, 0, 1, minU, maxU),
            v2: MathUtils.mapLinear(this.v2.v, 0, 1, minV, maxV),

            x3: this.v3.x, y3: this.v3.y, z3: this.v3.z,
            u3: MathUtils.mapLinear(this.v3.u, 0, 1, minU, maxU),
            v3: MathUtils.mapLinear(this.v3.v, 0, 1, minV, maxV),
        }
    }
}

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
        }
    }

    [Symbol.toString()]() {
        return ""
    }
}