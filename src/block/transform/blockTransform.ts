import type { TileCollider } from "../collider";
import type { BlockModel } from "../model/blockModel";

export abstract class BlockTransform<TransformParameters = any> {
    public constructor(
        public readonly args: TransformParameters
    ) {}
    public transformModel(model: BlockModel) {
        throw new Error("Transform is not implemented for block models");
    }
    public transformCollider(collider: TileCollider) {
        throw new Error("Transform is not implemented for block colliders");
    }
}