import z from "zod";

export namespace DataDrivenJson {
    export type EventAction = z.infer<typeof EventAction>;
    export const EventAction = z.object({
        id: z.string(),
        args: z.record(z.string(), z.any()).optional(),
    });

    export type EventActionPredicateTree = Record<string, EventActionPredicateTree[] | {}>;
    export const EventActionPredicateTree: z.ZodType<EventActionPredicateTree> = z.record(
        z.string(),
        z.union([
            z.array(z.lazy(() => EventActionPredicateTree)),
            z.any(),
        ])
    );

    export type EventActionWithPredicate = {
        if: EventActionPredicateTree;
        then: EventActionOrPredicate[] | EventActionOrPredicate;
        else?: EventActionOrPredicate[] | EventActionOrPredicate | undefined;
    };
    export const EventActionWithPredicate: z.ZodType<EventActionWithPredicate> = z.object({
        if: EventActionPredicateTree,
        then: z.union([ z.array(z.lazy(() => EventActionOrPredicate)), z.lazy(() => EventActionOrPredicate) ]),
        else: z.union([ z.array(z.lazy(() => EventActionOrPredicate)), z.lazy(() => EventActionOrPredicate) ]).optional(),
    });

    export type EventActionOrPredicate = z.infer<typeof EventActionOrPredicate>;
    export const EventActionOrPredicate = z.union([ EventAction, EventActionWithPredicate ]);

    export type EventSheet = {
        id?: string | undefined,
        include?: EventSheetList | undefined,
        triggers?: Record<string, EventActionOrPredicate | EventActionOrPredicate[]> | undefined
    };
    export const EventSheet: z.ZodType<EventSheet> = z.object({
        id: z.string().optional(),
        include: z.lazy(() => EventSheetList).optional(),
        triggers: z.record(z.string(), z.union([ z.array(EventActionOrPredicate), EventActionOrPredicate ])).optional(),
    });

    export type EventSheetList = z.infer<typeof EventSheetList>;
    export const EventSheetList = z.union([ z.string(), EventSheet, z.array(z.union([ z.string(), EventSheet ])) ]);

    export type BlockStateCollider = z.infer<typeof BlockStateCollider>;
    export const BlockStateCollider = z.object({
        hitboxes: z.array(z.object({
            from: z.tuple([ z.number(), z.number(), z.number() ]),
            to: z.tuple([ z.number(), z.number(), z.number() ]),
        })),
    });

    export type InventoryGuiSlotType = z.infer<typeof InventoryGuiSlotType>;
    export const InventoryGuiSlotType = z.object({
        id: z.union([ z.string(), z.number() ]),
        pos: z.tuple([ z.number(), z.number() ]),
        size: z.number().optional(),
    });

    export type BlockStateModelFace = z.infer<typeof BlockStateModelFace>;
    export const BlockStateModelFace = z.object({
        pos: z.tuple([ z.number(), z.number(), z.number() ]),
        size: z.tuple([ z.number(), z.number() ]),
        uv: z.tuple([ z.number(), z.number(), z.number(), z.number() ]),
        texture: z.string(),
        rotation: z.number().optional(),
        lit: z.boolean().optional(),
        aoReceiveWeight: z.number().optional(),
    });

    export type BlockStateModelIncludeEntry = {
        model: BlockStateModel | string;
        transforms?: Record<string, any>[] | Record<string, any> | undefined;
    };
    export const BlockStateModelIncludeEntry: z.ZodType<BlockStateModelIncludeEntry> = z.object({
        model: z.union([ z.lazy(() => BlockStateModel), z.string() ]),
        transforms: z.union([
            z.array(z.record(z.string(), z.any())),
            z.record(z.string(), z.any()),
        ]).optional(),
    });

    export type BlockStateModel = z.infer<typeof BlockStateModel>;
    export const BlockStateModel = z.object({
        id: z.string().optional(),
        include: z.union([
            z.array(z.union([ BlockStateModelIncludeEntry, z.string() ])),
            BlockStateModelIncludeEntry,
            z.string(),
        ]).optional(),

        occlude: z.boolean().optional(),
        occludeNorth: z.boolean().optional(),
        occludeEast: z.boolean().optional(),
        occludeSouth: z.boolean().optional(),
        occludeWest: z.boolean().optional(),
        occludeUp: z.boolean().optional(),
        occludeDown: z.boolean().optional(),

        aoCastWeight: z.number().optional(),

        textures: z.record(z.string(), z.string()).optional(),

        north: z.array(BlockStateModelFace).optional(),
        east: z.array(BlockStateModelFace).optional(),
        south: z.array(BlockStateModelFace).optional(),
        west: z.array(BlockStateModelFace).optional(),
        up: z.array(BlockStateModelFace).optional(),
        down: z.array(BlockStateModelFace).optional(),
    });

    export type BlockState = z.infer<typeof BlockState>;
    export const BlockState = z.object({
        model: z.union([ BlockStateModel, z.string() ]),
        events: EventSheetList.optional(),
        canPlace: z.union([ EventActionPredicateTree, z.boolean() ]).optional(),
        collider: BlockStateCollider.optional(),
        emission: z.union([ z.record(z.string(), z.number()), z.number() ]).optional(),
        attenuation: z.union([ z.record(z.string(), z.number()), z.number() ]).optional(),
        tags: z.array(z.string()).optional(),
        pickBlockState: z.string().optional(),
        renderAsTexture: z.string().optional(),
        destroyTime: z.number().default(1)
    });

    export type Block = z.infer<typeof Block>;
    export const Block = z.object({
        id: z.string(),
        blockEntity: z.string().optional(),
        defaultStateProperties: BlockState.partial().optional(),
        states: z.record(z.string(), BlockState),
    });

    export type BlockEntitySlot = z.infer<typeof BlockEntitySlot>;
    export const BlockEntitySlot = z.object({
        extract: z.boolean().optional(),
        insert: z.boolean().optional(),
        onInsert: z.string().optional(),
        onExtract: z.string().optional(),
        onChange: z.string().optional(),
    });

    export type BlockEntityType = z.infer<typeof BlockEntityType>;
    export const BlockEntityType = z.object({
        id: z.string(),
        slots: z.array(BlockEntitySlot).optional(),
        tickable: z.boolean().optional(),
    });

    export type InventoryGuiGraphicType = z.infer<typeof InventoryGuiGraphicType>;
    export const InventoryGuiGraphicType = z.object({
        type: z.string(),
        pos: z.tuple([ z.number(), z.number() ]),
        events: EventSheetList.optional(),
        renderIf: z.union([ EventActionPredicateTree, z.boolean() ]).optional(),
    }).loose();

    export type GuiType = z.infer<typeof GuiType>;
    export const GuiType = z.object({
        id: z.string(),
        texture: z.string(),
        anchor: z.tuple([ z.number(), z.number() ]).optional(),
        offset: z.tuple([ z.number(), z.number() ]).optional(),
        inventories: z.array(z.string()).optional(),
        quickMoveGroups: z.record(z.string(), z.array(z.union([ z.string(), z.number() ]))).optional(),
        slots: z.array(InventoryGuiSlotType).optional(),
        graphics: z.record(z.string(), InventoryGuiGraphicType).optional(),
        interactive: z.boolean().optional(),
        modal: z.boolean().optional(),
    });

    export type TemplateApplicable = z.infer<typeof TemplateApplicable>;
    export const TemplateApplicable = z.object({
        template: z.object({
            id: z.string(),
            arguments: z.record(z.string(), z.any()),
        }).optional(),
    });

    export type JsonTemplate = z.infer<typeof JsonTemplate>;
    export const JsonTemplate = z.object({
        id: z.string(),
        parameters: z.record(z.string(), z.string()),
        json: z.any(),
    });

    export type Item = z.infer<typeof Item>;
    export const Item = z.object({
        id: z.string(),
        texture: z.string(),
        events: EventSheetList.optional(),
        tags: z.array(z.string()).optional(),
    });

    export type LightChannelType = z.infer<typeof LightChannelType>;
    export const LightChannelType = z.object({
        id: z.string(),
        defaultColor: z.tuple([ z.number(), z.number(), z.number() ]),
        celestial: z.boolean().optional(),
        type: z.enum([ "point_source", "cascading" ]).optional(),
    });
}
