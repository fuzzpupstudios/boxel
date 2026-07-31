import { Vector2 } from "three";
import z from "zod";
import type { TileCollider } from "../collider";
import type { BlockModel } from "../model/blockModel";
import { BlockTransform } from "./blockTransform";

export type RotateBlockTransformParameters = z.infer<typeof RotateBlockTransformParameters>;
export const RotateBlockTransformParameters = z.union([
    z.object({
        angle: z.int(),
        pivot: z.tuple([ z.number(), z.number() ]).default([ 0.5, 0.5 ]),
        transformUVs: z.boolean().default(false)
    }),
    z.number()
]);

abstract class RotateBlockTransform extends BlockTransform<RotateBlockTransformParameters> {
    public constructor(parameters: any) {
        super(RotateBlockTransformParameters.parse(parameters));
    }
    public override transformModel(model: BlockModel): void {
        let angle = 0;
        const pivot = new Vector2(0.5, 0.5);
        let transformUVs = false;

        if(typeof this.args == "number") {
            angle = this.args;
        } else {
            angle = this.args.angle;
            pivot.set(...this.args.pivot),
            transformUVs = this.args.transformUVs
        }

        this.rotateModel(model, angle, pivot, transformUVs);
    }
    public override transformCollider(collider: TileCollider): void {
        let angle = 0;
        const pivot = new Vector2(0.5, 0.5);
        if(typeof this.args == "number") {
            angle = this.args;
        } else {
            angle = this.args.angle;
            pivot.set(...this.args.pivot);
        }
        this.rotateCollider(collider, angle, pivot);
    }
    protected abstract rotateModel(model: BlockModel, angle: number, pivot: Vector2, transformUVs: boolean): void;
    protected abstract rotateCollider(collider: TileCollider, angle: number, pivot: Vector2): void;
}

export class RotateXBlockTransform extends RotateBlockTransform {
    public override rotateModel(model: BlockModel, angle: number, pivot: Vector2, transformUVs: boolean): void {
        model.rotateX(angle, pivot, transformUVs);
    }
    public override rotateCollider(collider: TileCollider, angle: number, pivot: Vector2): void {
        collider.rotateX(angle, pivot);
    }
}

export class RotateYBlockTransform extends RotateBlockTransform {
    public override rotateModel(model: BlockModel, angle: number, pivot: Vector2, transformUVs: boolean): void {
        model.rotateY(angle, pivot, transformUVs);
    }
    public override rotateCollider(collider: TileCollider, angle: number, pivot: Vector2): void {
        collider.rotateY(angle, pivot);
    }
}

export class RotateZBlockTransform extends RotateBlockTransform {
    public override rotateModel(model: BlockModel, angle: number, pivot: Vector2, transformUVs: boolean): void {
        model.rotateZ(angle, pivot, transformUVs);
    }
    public override rotateCollider(collider: TileCollider, angle: number, pivot: Vector2): void {
        collider.rotateZ(angle, pivot);
    }
}