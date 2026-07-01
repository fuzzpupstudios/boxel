import { MathUtils, type Box2 } from "three";
import type { TextureAtlas } from "../assets/textureAtlas";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { TileFace, TileMesh } from "../rendering/chunkMesher";
import { Assets, type TextureSource } from "../assets/assets";

export class BlockModelFace {
    public x = 0;
    public y = 0;
    public z = 0;
    public width = 1;
    public height = 1;
    public cull = true;
    public uvMinX = 0;
    public uvMaxX = 0;
    public uvMinY = 1;
    public uvMaxY = 1;
    public aoReceiveWeight = 1;
    public textureSlot = "";
    public texturePosition: Box2 | null = null;

    public static parseJson(json: DataDrivenJson.BlockStateModelFace): BlockModelFace {
        const face = new BlockModelFace;

        [ face.x, face.y, face.z ] = json.pos;
        [ face.width, face.height ] = json.size;
        [ face.uvMinX, face.uvMinY, face.uvMaxX, face.uvMaxY ] = json.uv;
        face.textureSlot = json.texture ?? "axes";
        face.cull = json.cull ?? face.cull;
        face.aoReceiveWeight = json.aoReceiveWeight ?? face.aoReceiveWeight;

        return face;
    }

    public setTexturePosition(texturePosition: Box2) {
        this.texturePosition = texturePosition;
    }

    public compile(): TileFace {
        if(this.texturePosition == null)
            throw new ReferenceError("Texture position has not been defined");

        return {
            x: this.x, y: this.y, z: this.z,
            width: this.width, height: this.height,
            cull: this.cull,

            aoReceiveWeight: this.aoReceiveWeight,

            // Map the local uv coordinates of the face to the
            // position passed in via setTexturePosition()
            uvMinX: MathUtils.mapLinear(this.uvMinX, 0, 1,
                this.texturePosition.min.x, this.texturePosition.max.x),
            uvMaxX: MathUtils.mapLinear(this.uvMaxX, 0, 1,
                this.texturePosition.min.x, this.texturePosition.max.x),
            
            uvMinY: MathUtils.mapLinear(this.uvMinY, 0, 1,
                this.texturePosition.min.y, this.texturePosition.max.y),
            uvMaxY: MathUtils.mapLinear(this.uvMaxY, 0, 1,
                this.texturePosition.min.y, this.texturePosition.max.y),
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
    public aoCastWeight = 1;

    public north = new Array<BlockModelFace>;
    public east = new Array<BlockModelFace>;
    public south = new Array<BlockModelFace>;
    public west = new Array<BlockModelFace>;
    public up = new Array<BlockModelFace>;
    public down = new Array<BlockModelFace>;

    public textureURIs = new Map<string, string>;
    public textureSources = new Map<string, TextureSource>;

    public static parseJson(json: DataDrivenJson.BlockStateModel, assets: Assets): BlockModel {
        const model = new BlockModel;

        model.occludeNorth = json.occludeNorth ?? json.occlude ?? model.occludeNorth,
        model.occludeEast = json.occludeEast ?? json.occlude ?? model.occludeEast,
        model.occludeSouth = json.occludeSouth ?? json.occlude ?? model.occludeSouth,
        model.occludeWest = json.occludeWest ?? json.occlude ?? model.occludeWest,
        model.occludeUp = json.occludeUp ?? json.occlude ?? model.occludeUp,
        model.occludeDown = json.occludeDown ?? json.occlude ?? model.occludeDown,

        model.aoCastWeight = json.aoCastWeight ?? model.aoCastWeight;

        model.north.push(...(json.north ?? []).map(BlockModelFace.parseJson));
        model.east.push(...(json.east ?? []).map(BlockModelFace.parseJson));
        model.south.push(...(json.south ?? []).map(BlockModelFace.parseJson));
        model.west.push(...(json.west ?? []).map(BlockModelFace.parseJson));
        model.up.push(...(json.up ?? []).map(BlockModelFace.parseJson));
        model.down.push(...(json.down ?? []).map(BlockModelFace.parseJson));

        for(const [ textureSlot, textureURI ] of Object.entries(json.textures ?? {})) {
            // Gets the texture source or creates it if it doesn't exist
            const textureSource = assets.getURLTextureSource(textureURI);
            model.textureSources.set(textureSlot, textureSource);
            model.textureURIs.set(textureSlot, textureURI);
        }

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
            const textureURI = this.textureURIs.get(face.textureSlot) ?? "axes";

            // Find the position of the URI on the atlas
            const uv = atlas.positions.get(textureURI);
            if(uv == null) throw new ReferenceError(
                "Texture atlas position for " + textureURI + " not found");

            // Set the face's position on the texture atlas
            face.setTexturePosition(uv);
        }
    }

    public compile(): TileMesh {
        return {
            skipRender: Array.from(this.faces()).length == 0,

            aoCastWeight: this.aoCastWeight,

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