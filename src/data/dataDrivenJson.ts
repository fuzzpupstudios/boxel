export namespace DataDrivenJson {
    export interface Block {
        states: BlockState[]
    }

    export interface BlockState {
        model: BlockModel
    }

    export interface BlockModel {
        skipRender?: boolean;
        occlude?: boolean;
        occludeNorth?: boolean,
        occludeEast?: boolean,
        occludeSouth?: boolean,
        occludeWest?: boolean,
        occludeUp?: boolean,
        occludeDown?: boolean,
        north?: BlockModelFace[],
        east?: BlockModelFace[],
        south?: BlockModelFace[],
        west?: BlockModelFace[],
        up?: BlockModelFace[],
        down?: BlockModelFace[],
    }

    export interface BlockModelFace {
        pos: [ number, number, number ],
        size: [ number, number ],
        uv: [ number, number, number, number ],
        cull?: boolean
    }
}