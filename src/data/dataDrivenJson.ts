export namespace DataDrivenJson {
    export interface Block {
        id: string;
        states: Record<string, BlockState>
    }

    export interface BlockState {
        model: BlockStateModel,
        events?: EventSheet,
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

    export interface EventSheet {
        triggers: Record<string, EventAction[]>
    }

    export interface EventAction {
        id: string;
        args?: {}
    }
    
    export interface BlockStateCollider {
        hitboxes: {
            from: [ number, number, number ],
            to: [ number, number, number ]
        }[]
    }

    export interface InventoryGuiSlotType {
        id: number;
        pos: [ number, number ],
        size?: number,
        insert?: boolean;
        extract?: boolean;
    }

    export interface InventoryGuiType {
        id: string;
        texture: string;
        slots: InventoryGuiSlotType[];
        interactive?: boolean;
    }
}