import type { DataDrivenJson } from "../data/dataDrivenJson";
import type { TileFace, TileMesh } from "../rendering/chunkMesher";
import { Block, BlockState } from "./block";

export class DataDrivenBlock extends Block {
    public constructor(
        private readonly data: DataDrivenJson.Block
    ) {
        super();
    }

    private static parseJsonModelFace(face: DataDrivenJson.BlockModelFace): TileFace {
        return {
            x: face.pos[0], y: face.pos[1], z: face.pos[2],
            width: face.size[0], height: face.size[1],
            uvMinX: face.uv[0], uvMinY: face.uv[1],
            uvMaxX: face.uv[2], uvMaxY: face.uv[3],
            cull: face.cull ?? true
        };
    }
    private static parseJsonModel(model: DataDrivenJson.BlockModel): TileMesh {
        return {
            skipRender: model.skipRender ?? false,

            occludeNorth: model.occludeNorth ?? model.occlude ?? true,
            occludeEast: model.occludeEast ?? model.occlude ?? true,
            occludeSouth: model.occludeSouth ?? model.occlude ?? true,
            occludeWest: model.occludeWest ?? model.occlude ?? true,
            occludeUp: model.occludeUp ?? model.occlude ?? true,
            occludeDown: model.occludeDown ?? model.occlude ?? true,

            north: model.north?.map(face => this.parseJsonModelFace(face)) ?? [],
            east: model.east?.map(face => this.parseJsonModelFace(face)) ?? [],
            south: model.south?.map(face => this.parseJsonModelFace(face)) ?? [],
            west: model.west?.map(face => this.parseJsonModelFace(face)) ?? [],
            up: model.up?.map(face => this.parseJsonModelFace(face)) ?? [],
            down: model.down?.map(face => this.parseJsonModelFace(face)) ?? [],
        };
    }

    protected override buildStates(): BlockState[] {
        return this.data.states.map(state => ({
            model: DataDrivenBlock.parseJsonModel(state.model),
        }));
    }
}