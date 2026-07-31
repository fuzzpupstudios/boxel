import { Box3, Vector3 } from "three";
import z from "zod";
import type { TileCollider } from "../collider";
import { BlockTransform } from "./blockTransform";

export type SliceBlockTransformParameters = z.infer<typeof SliceBlockTransformParameters>;
export const SliceBlockTransformParameters = z.object({
    from: z.tuple([ z.number(), z.number(), z.number() ]),
    to: z.tuple([ z.number(), z.number(), z.number() ]),
    origin: z.tuple([ z.number(), z.number(), z.number() ]).optional()
});

export class SliceBlockTransform extends BlockTransform<SliceBlockTransformParameters> {
    public constructor(parameters: any) {
        super(SliceBlockTransformParameters.parse(parameters));
    }
    public override transformCollider(collider: TileCollider): void {
        collider.slice(new Box3(
            new Vector3(...this.args.from),
            new Vector3(...this.args.to)
        ));
        if(this.args.origin != null) {
            collider.translate(-this.args.origin[0], -this.args.origin[1], -this.args.origin[2]);
        }
    }
}