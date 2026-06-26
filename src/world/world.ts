import { Vector3 } from "three";
import { Entity, type Tickable } from "../entity/entity";
import { VoxelGrid } from "./voxelGrid";

export class World {
    public readonly tiles = new VoxelGrid;
    public readonly tickables = new Set<Tickable>;
    public readonly gravity = new Vector3(0, -32, 0);
}