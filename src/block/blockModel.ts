import { Euler, MathUtils, Matrix3, Matrix4, Quaternion, Vector2, Vector3, type Box2 } from "three";
import z from "zod";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { TileFace, TileMesh } from "../rendering/chunkMesher";
import { Assets } from "../textures/assets";
import type { TextureAtlas } from "../textures/textureAtlas";

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
}

export class BlockModelFace {
    public v0 = new BlockModelVertex;
    public v1 = new BlockModelVertex;
    public v2 = new BlockModelVertex;
    public v3 = new BlockModelVertex;
    public cull = true;
    public rotation = 0;
    public lit = false;
    public textureSlot = "";
    public texturePosition: Box2 | null = null;

    public static parseJson(json: DataDrivenJson.BlockStateModelFace, normal: Vector3): BlockModelFace {
        const face = new BlockModelFace;

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
        face.cull = json.cull ?? face.cull;
        face.lit = json.lit ?? face.lit;

        return face;
    }
    
    public clone(): any {
        const face = new BlockModelFace();
        face.v0 = this.v0.clone();
        face.v1 = this.v1.clone();
        face.v2 = this.v2.clone();
        face.v3 = this.v3.clone();
        
        face.cull = this.cull;
        face.rotation = this.rotation;
        face.lit = this.lit;
        face.textureSlot = this.textureSlot;
        
        if(this.texturePosition != null) {
            face.texturePosition = this.texturePosition.clone();
        }

        return face;
    }

    public applyMatrix4(matrix: Matrix4) {
        this.v0.applyMatrix4(matrix);
        this.v1.applyMatrix4(matrix);
        this.v2.applyMatrix4(matrix);
        this.v3.applyMatrix4(matrix);
    }

    public applyMatrix3(matrix: Matrix3) {
        this.v0.applyMatrix3(matrix);
        this.v1.applyMatrix3(matrix);
        this.v2.applyMatrix3(matrix);
        this.v3.applyMatrix3(matrix);
    }

    public rotateVertexIndicesCW() {
        [ this.v0, this.v1, this.v2, this.v3 ] =
        [ this.v1, this.v2, this.v3, this.v0 ]
    }
    public rotateVertexIndicesCCW() {
        [ this.v0, this.v1, this.v2, this.v3 ] =
        [ this.v1, this.v2, this.v3, this.v0 ]
    }

    public setTexturePosition(texturePosition: Box2) {
        this.texturePosition = texturePosition;
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
            cull: this.cull,
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
    public occludeNorth = true;
    public occludeEast = true;
    public occludeSouth = true;
    public occludeWest = true;
    public occludeUp = true;
    public occludeDown = true;

    public north = new Array<BlockModelFace>;
    public east = new Array<BlockModelFace>;
    public south = new Array<BlockModelFace>;
    public west = new Array<BlockModelFace>;
    public up = new Array<BlockModelFace>;
    public down = new Array<BlockModelFace>;

    public textureURIs = new Map<string, string>;
    public textureSources = new Map<string, ImageBitmap>;

    public static parseJson(json: DataDrivenJson.BlockStateModel, assets: Assets, defaultModel?: BlockModel): BlockModel {
        const parentJson = json.parent != null ? assets.blockModelRegistry.get(json.parent) : null;

        let model: BlockModel;

        if(parentJson == null) {
            model = new BlockModel;
        } else {
            try {
                model = BlockModel.parseJson(parentJson, assets);
            } catch(e) {
                throw new Error("Failed to parse parent " + json.parent, { cause: e });
            }
        }

        if(defaultModel != null) {
            model.north.push(...defaultModel.north.map(face => face.clone()));
            model.east.push(...defaultModel.east.map(face => face.clone()));
            model.south.push(...defaultModel.south.map(face => face.clone()));
            model.west.push(...defaultModel.west.map(face => face.clone()));
            model.up.push(...defaultModel.up.map(face => face.clone()));
            model.down.push(...defaultModel.down.map(face => face.clone()));

            for(const [ key, value ] of defaultModel.textureSources.entries()) {
                model.textureSources.set(key, value);
            }
            for(const [ key, value ] of defaultModel.textureURIs.entries()) {
                model.textureURIs.set(key, value);
            }
        }

        model.occludeNorth = json.occludeNorth ?? defaultModel?.occludeNorth ?? json.occlude ?? model.occludeNorth;
        model.occludeEast = json.occludeEast ?? defaultModel?.occludeEast ?? json.occlude ?? model.occludeEast;
        model.occludeSouth = json.occludeSouth ?? defaultModel?.occludeSouth ?? json.occlude ?? model.occludeSouth;
        model.occludeWest = json.occludeWest ?? defaultModel?.occludeWest ?? json.occlude ?? model.occludeWest;
        model.occludeUp = json.occludeUp ?? defaultModel?.occludeUp ?? json.occlude ?? model.occludeUp;
        model.occludeDown = json.occludeDown ?? defaultModel?.occludeDown ?? json.occlude ?? model.occludeDown;

        model.north.push(...(json.north ?? []).map(json => BlockModelFace.parseJson(json, new Vector3(0, 0, 1))));
        model.east.push(...(json.east ?? []).map(json => BlockModelFace.parseJson(json, new Vector3(1, 0, 0))));
        model.south.push(...(json.south ?? []).map(json => BlockModelFace.parseJson(json, new Vector3(0, 0, -1))));
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

        if(json.transforms != null) {
            for(const transforms of json.transforms instanceof Array ? json.transforms : [ json.transforms ]) {
                for(const [ id, params ] of Object.entries(transforms)) {
                    const transform = blockModelTransforms[id];
                    if(transform == null) throw new ReferenceError("Unknown transform " + id);

                    transform(model, params);
                }
            }
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
                
            for(const face of this.east) {
                if(transformUVs) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * -0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                face.rotateVertexIndicesCW();
            }
            for(const face of this.west) {
                if(transformUVs) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * 0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                face.rotateVertexIndicesCCW();
            }

            [ this.occludeUp, this.occludeNorth, this.occludeDown, this.occludeSouth ] =
            [ this.occludeNorth, this.occludeDown, this.occludeSouth, this.occludeUp ];

            [ this.up, this.north, this.down, this.south ] =
            [ this.north, this.down, this.south, this.up ];
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
                
            for(const face of this.up) {
                if(transformUVs) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * -0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                face.rotateVertexIndicesCW();
            }
            for(const face of this.down) {
                if(transformUVs) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * 0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                face.rotateVertexIndicesCCW();
            }

            [ this.occludeNorth, this.occludeEast, this.occludeSouth, this.occludeWest ] =
            [ this.occludeEast, this.occludeSouth, this.occludeWest, this.occludeNorth ];

            [ this.north, this.east, this.south, this.west ] =
            [ this.east, this.south, this.west, this.north ];
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
                
            for(const face of this.south) {
                if(transformUVs) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * -0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                face.rotateVertexIndicesCW();
            }
            for(const face of this.north) {
                if(transformUVs) {
                    face.applyMatrix3(new Matrix3().translate(-pivot.x, -pivot.y));
                    face.applyMatrix3(new Matrix3().rotate(Math.PI * 0.5));
                    face.applyMatrix3(new Matrix3().translate(pivot.x, pivot.y));
                }
                face.rotateVertexIndicesCCW();
            }

            [ this.occludeUp, this.occludeEast, this.occludeDown, this.occludeWest ] =
            [ this.occludeEast, this.occludeDown, this.occludeWest, this.occludeUp ];

            [ this.up, this.east, this.down, this.west ] =
            [ this.east, this.down, this.west, this.up ];
        }
        this.translate(offset, false);
    }

    public correctVertexIndices() {
        for(const face of this.north) {
            if(face.v0.x > face.v3.x) [ face.v0, face.v3 ] = [ face.v3, face.v0 ];
            if(face.v1.x > face.v2.x) [ face.v1, face.v2 ] = [ face.v2, face.v1 ];
            if(face.v0.y > face.v1.y) [ face.v0, face.v1 ] = [ face.v1, face.v0 ];
            if(face.v3.y > face.v2.y) [ face.v3, face.v2 ] = [ face.v2, face.v3 ];
        }
        for(const face of this.south) {
            if(face.v0.x < face.v3.x) [ face.v0, face.v3 ] = [ face.v3, face.v0 ];
            if(face.v1.x < face.v2.x) [ face.v1, face.v2 ] = [ face.v2, face.v1 ];
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
            if(face.v0.x > face.v3.x) [ face.v0, face.v3 ] = [ face.v3, face.v0 ];
            if(face.v1.x > face.v2.x) [ face.v1, face.v2 ] = [ face.v2, face.v1 ];
            if(face.v0.z < face.v1.z) [ face.v0, face.v1 ] = [ face.v1, face.v0 ];
            if(face.v3.z < face.v2.z) [ face.v3, face.v2 ] = [ face.v2, face.v3 ];
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
            if(face.cull) continue;

            renderAnyWhenCulled = true;
            break;
        }
        
        return {
            skipRender: Array.from(this.faces()).length == 0,
            renderAnyWhenCulled,

            occludeNorth: this.occludeNorth,
            occludeEast: this.occludeEast,
            occludeSouth: this.occludeSouth,
            occludeWest: this.occludeWest,
            occludeUp: this.occludeUp,
            occludeDown: this.occludeDown,

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