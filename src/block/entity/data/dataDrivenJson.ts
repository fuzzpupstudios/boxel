export namespace DataDrivenJson {
    export interface Block {
        id: string,
        blockEntity?: string,
        defaultStateProperties?: BlockState,
        states: Record<string, BlockState>
    }

    export interface BlockEntitySlot {
        extract?: boolean;
        insert?: boolean;
        onInsert?: string;
        onExtract?: string;
        onChange?: string;
    }

    export interface BlockEntity {
        id: string,
        slots?: BlockEntitySlot[],
        tickable?: boolean,
    }

    export interface BlockState {
        model: BlockStateModel | string,
        events?: EventSheet | string[] | string,
        canPlace?: EventActionPredicateTree | boolean;
        collider?: BlockStateCollider,
        emission?: Record<string, number> | number,
        attenuation?: Record<string, number> | number,
        tags?: string[],
        pickBlockState?: string,
        renderAsTexture?: string,
    }

    export interface BlockStateModelIncludeEntry {
        model: BlockStateModel | string;
        transforms?: Record<string, any>[] | Record<string, any>
    }

    export interface BlockStateModel {
        id?: string;
        include?: (BlockStateModelIncludeEntry | string)[] | BlockStateModelIncludeEntry | string;

        occlude?: boolean;
        occludeNorth?: boolean,
        occludeEast?: boolean,
        occludeSouth?: boolean,
        occludeWest?: boolean,
        occludeUp?: boolean,
        occludeDown?: boolean,

        aoCastWeight?: number,

        textures?: Record<string, string>,
        
        north?: BlockStateModelFace[],
        east?: BlockStateModelFace[],
        south?: BlockStateModelFace[],
        west?: BlockStateModelFace[],
        up?: BlockStateModelFace[],
        down?: BlockStateModelFace[]
    }

    export interface BlockStateModelFace {
        pos: [ number, number, number ],
        size: [ number, number ],
        uv: [ number, number, number, number ],
        texture: string,
        rotation?: number,
        lit?: boolean,
        aoReceiveWeight?: number
    }

    export interface EventSheet {
        id?: string;
        include?: string | string[];
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
        id: string | number;
        pos: [ number, number ],
        size?: number,
    }

    export interface InventoryGuiGraphicType {
        type: string,
        pos: [ number, number ],
        events?: EventSheet | string[] | string,
        renderIf?: EventActionPredicateTree | boolean
    }

    export interface InventoryGuiType {
        id: string;
        texture: string;
        anchor?: [ number, number ],
        offset?: [ number, number ],
        inventories?: string[],
        quickMoveGroups?: Record<string, (string | number)[]>,
        slots?: InventoryGuiSlotType[];
        graphics?: Record<string, InventoryGuiGraphicType>;
        interactive?: boolean;
        modal?: boolean;
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

    export interface Item {
        id: string;
        texture: string;
        events?: EventSheet | string[] | string;
        tags?: string[];
    }

    export interface LightChannelType {
        id: string;
        defaultColor: [ number, number, number ];
        celestial?: boolean;
        type?: "point_source" | "cascading"
    }
}