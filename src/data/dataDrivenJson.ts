export namespace DataDrivenJson {
    export interface Block {
        id: string;
        states: Record<string, BlockState>
    }

    export interface BlockState {
        model: BlockStateModel,
        collider?: BlockStateCollider,
        emission?: [ number, number, number ],
        attenuation?: [ number, number, number ],
        tags?: string[]
    }

    export interface BlockStateModel {
        skipRender?: boolean;
        occlude?: boolean;
        occludeNorth?: boolean,
        occludeEast?: boolean,
        occludeSouth?: boolean,
        occludeWest?: boolean,
        occludeUp?: boolean,
        occludeDown?: boolean,
        textures?: Record<string, string>,
        north?: BlockStateModelFace[],
        east?: BlockStateModelFace[],
        south?: BlockStateModelFace[],
        west?: BlockStateModelFace[],
        up?: BlockStateModelFace[],
        down?: BlockStateModelFace[],
    }

    export interface BlockStateModelFace {
        pos: [ number, number, number ],
        size: [ number, number ],
        uv: [ number, number, number, number ],
        texture?: string,
        cull?: boolean,
        lit?: boolean
    }
    
    export interface BlockStateCollider {
        hitboxes: {
            from: [ number, number, number ],
            to: [ number, number, number ]
        }[]
    }
}