import type { Object3D } from "three";
import type { TextureAtlases } from "../boxel";
import type { WorldRenderer } from "../rendering/worldRenderer";
import type { Time } from "../time";
import type { World } from "../world/world";
import { Entity } from "./entity";
import { ItemEntityRenderer } from "./itemEntityRenderer";
import { ItemHologramProvider } from "./itemHologram";

export class EntityRenderer {
    public readonly entities = new Set<Entity>;

    public readonly itemEntityRenderer: ItemEntityRenderer;

    public constructor(
        public readonly root: Object3D,
        public readonly world: World,
        public readonly worldRenderer: WorldRenderer,
        textureAtlases: TextureAtlases,
    ) {
        this.itemEntityRenderer = new ItemEntityRenderer(
            world, worldRenderer,
            new ItemHologramProvider(textureAtlases));
        
        this.root.add(this.itemEntityRenderer.batchedMesh);
    }

    
    public addEntity(entity: Entity) {
        this.entities.add(entity);
    }

    public removeEntity(entity: Entity) {
        this.entities.delete(entity);
    }

    public render(time: Time) {
        const larp = 1 - 0.5 ** (time.deltaTime * 30);

        for(const entity of this.entities) {
            if(entity.renderPosition.manhattanDistanceTo(entity.position) > 10) {
                entity.renderPosition.copy(entity.position);
            } else {
                entity.renderPosition.lerp(entity.position, larp);
            }
            entity.render(time);
        }
    }
}