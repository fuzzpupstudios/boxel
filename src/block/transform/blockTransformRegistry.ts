import { KeyedRegistry } from "objectregistry";
import type { BlockTransform } from "./blockTransform";
import { RotateXBlockTransform, RotateYBlockTransform, RotateZBlockTransform } from "./rotation";
import { ScaleBlockTransform } from "./scale";
import { SliceBlockTransform } from "./slice";
import { TranslateBlockTransform } from "./translation";

export const blockTransformRegistry = new KeyedRegistry<new (args: any) => BlockTransform>;

blockTransformRegistry.register("rotateX", RotateXBlockTransform);
blockTransformRegistry.register("rotateY", RotateYBlockTransform);
blockTransformRegistry.register("rotateZ", RotateZBlockTransform);
blockTransformRegistry.register("translate", TranslateBlockTransform);
blockTransformRegistry.register("scale", ScaleBlockTransform);
blockTransformRegistry.register("slice", SliceBlockTransform);