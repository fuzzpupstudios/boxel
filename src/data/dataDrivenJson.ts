export namespace DataDrivenJson {
    export interface Block {
        id: string,
        defaultStateProperties?: BlockState,
        states: Record<string, BlockState>
    }

    export interface BlockState {
        model: BlockStateModel | string,
        events?: EventSheet | string,
        canPlace?: EventActionPredicateTree | boolean;
        collider?: BlockStateCollider,
        emission?: [ number, number, number ],
        attenuation?: [ number, number, number ],
        tags?: string[]
    }

    export interface BlockStateModel {
        id?: string;
        parent?: string;

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

        transforms?: Record<string, any>[] | Record<string, any>
    }

    export interface BlockStateModelFace {
        pos: [ number, number, number ],
        size: [ number, number ],
        uv: [ number, number, number, number ],
        texture: string,
        rotation?: number;
        cull?: boolean,
        lit?: boolean
    }

    export interface EventSheet {
        id?: string;
        parent?: string;
        triggers?: Record<string, EventAction[] | EventAction>
    }

    export interface EventAction {
        id: string;
        args?: {}
    }

    export interface EventActionWithPredicate {
        if: EventActionPredicateTree,
        then: EventAction[] | EventAction,
        else?: EventAction[] | EventAction,
    }

    export type EventActionPredicateTree = Record<string, EventActionPredicateTree[] | {}>
    
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

    export interface TemplateApplicable {
        template?: {
            id: string;
            arguments: Record<string, any>;
        };
    }

    export interface JsonTemplate {
        id: string;
        parameters: Record<string, string>;
        json: any;
    }
}