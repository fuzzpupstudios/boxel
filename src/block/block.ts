import type { BlockState } from "./blockState";
import type { BlockEntityType } from "./entity/blockEntity";

export abstract class Block {
    public states: Map<string, BlockState> = new Map;
    public abstract id: string;
    public blockEntity: BlockEntityType | null = null;

    public toString() {
        return `{Block id=${this.id}}`
    }
}
