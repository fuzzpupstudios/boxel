import { KeyedRegistry } from "objectregistry";
import type { World } from "../world/world";
import type { Entity } from "./entity";
import { ItemEntity } from "./item";
import { Player } from "./player";

export const entityRegistry = new KeyedRegistry<new (world: World) => Entity>;

entityRegistry.register("base:player", Player);
entityRegistry.register("base:item", ItemEntity);