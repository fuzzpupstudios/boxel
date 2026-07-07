import { Assets } from "pixi.js";
import type { DataDrivenJson } from "../data/dataDrivenJson";
import { InventoryGuiType } from "./inventoryGui";

export class DataDrivenInventoryGuiType extends InventoryGuiType {
    public constructor(
        private readonly json: DataDrivenJson.InventoryGuiType
    ) {
        super(
            json.interactive ?? true
        );

        for(const slot of this.json.slots) {
            this.addSlot(
                slot.id,
                slot.pos[0], slot.pos[1],
                slot.insert ?? true,
                slot.extract ?? true,
                slot.size ?? 20,
            );
        }
    }

    public async loadTexture() {
        this.addTexture(await Assets.load(this.json.texture));
    }
}