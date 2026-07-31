import { Vector3 } from "three";
import z from "zod";
import type { TileCollider } from "../collider";
import type { BlockModel } from "../model/blockModel";
import { BlockTransform } from "./blockTransform";

export type ScaleBlockTransformParameters = z.infer<typeof ScaleBlockTransformParameters>;
export const ScaleBlockTransformParameters = z.union([
    z.tuple([ z.number(), z.number(), z.number() ]),
    z.object({
        scale: z.tuple([ z.number(), z.number(), z.number() ]),
        anchor: z.tuple([ z.number(), z.number(), z.number() ]).default([ 0.5, 0.5, 0.5 ]),
        transformUVs: z.boolean().default(false)
    })
]);

export class ScaleBlockTransform extends BlockTransform<ScaleBlockTransformParameters> {
    public constructor(parameters: any) {
        super(ScaleBlockTransformParameters.parse(parameters));
    }
    public override transformModel(model: BlockModel): void {
        if(this.args instanceof Array) {
            model.scale(new Vector3(...this.args), new Vector3(0.5, 0.5, 0.5), false);
        } else {
            model.scale(new Vector3(...this.args.scale), new Vector3(...this.args.anchor), this.args.transformUVs)
        }
    }
    public override transformCollider(collider: TileCollider): void {
        if(this.args instanceof Array) {
            collider.scale(...this.args, new Vector3(0.5, 0.5, 0.5));
        } else {
            collider.scale(...this.args.scale, new Vector3(...this.args.anchor));
        }
    }
}