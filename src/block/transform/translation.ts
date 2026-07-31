import { Vector3 } from "three";
import z from "zod";
import type { TileCollider } from "../collider";
import type { BlockModel } from "../model/blockModel";
import { BlockTransform } from "./blockTransform";

export type TranslateBlockTransformParameters = z.infer<typeof TranslateBlockTransformParameters>;
export const TranslateBlockTransformParameters = z.union([
    z.tuple([ z.number(), z.number(), z.number() ]),
    z.object({
        offset: z.tuple([ z.number(), z.number(), z.number() ]),
        transformUVs: z.boolean().default(false)
    })
]);

export class TranslateBlockTransform extends BlockTransform<TranslateBlockTransformParameters> {
    public constructor(parameters: any) {
        super(TranslateBlockTransformParameters.parse(parameters));
    }
    public override transformModel(model: BlockModel): void {
        if(this.args instanceof Array) {
            model.translate(new Vector3(...this.args), false);
        } else {
            model.translate(new Vector3(...this.args.offset), this.args.transformUVs)
        }
    }
    public override transformCollider(collider: TileCollider): void {
        if(this.args instanceof Array) {
            collider.translate(...this.args);
        } else {
            collider.translate(...this.args.offset);
        }
    }
}