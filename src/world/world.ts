import { Vector3 } from "three";
import { tileRegistry } from "../block/blockRegistry";
import { type Tickable } from "../entity/entity";
import { VoxelGrid } from "./voxelGrid";

export class World {
    public readonly tiles = new VoxelGrid;
    public readonly tickables = new Set<Tickable>;
    public readonly gravity = new Vector3(0, -32, 0);

    public getBlockStateKey(x: number, y: number, z: number): string {
        const tile = this.tiles.getTile(x, y, z);
        const stateKey = tileRegistry.get(tile);

        if(stateKey == null) throw new ReferenceError(
            "Block state for tile " + tile + " does not exist");

        return stateKey;
    }

    public setBlockStateKey(x: number, y: number, z: number, stateKey: string) {
        const tile = tileRegistry.findKey(stateKey);
        if(tile == null) throw new ReferenceError(
            "Block state " + stateKey + " is not registered");
        
        this.tiles.setTile(x, y, z, tile);
    }
}