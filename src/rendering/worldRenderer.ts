import { Scene } from "three";
import { Fn } from "three/src/nodes/TSL.js";
import { attribute, cameraPosition, Discard, float, If, mix, normalGeometry, pass, positionWorld, texture, uniform, uv, vec3, vec4 } from "three/tsl";
import { BoxGeometry, BufferGeometry, EdgesGeometry, LineBasicNodeMaterial, LineSegments, Material, MeshBasicNodeMaterial, Node, PerspectiveCamera, Vector3 } from "three/webgpu";
import type { TextureAtlases } from "../boxel";
import type { Assets } from "../data/assets";
import { EntityRenderer } from "../entity/entityRenderer";
import type { Time } from "../time";
import { Chunk, World } from "../world/world";
import { BatchedChunkRenderer } from "./meshing/batchedChunkRenderer";
import { BlockBreakOutline } from "./blockBreakOutline";
import { BlockBreakParticleEngine } from "./blockBreakParticleEngine";
import { BlockStateOutline } from "./blockStateOutline";
import { createLightColorNode } from "./lightUtils";
import type { Sky } from "./sky/sky";
import { VoidSky } from "./sky/voidSky";
import { MeshCache } from "./meshing/tileRendering";
import { blockStateRegistry, getUnknownBlockState } from "../block/blockRegistry";

export class WorldRenderer {
    public maxChunkUpdates = 16;
    public readonly fogDistance = uniform(64);
    public readonly scene = new Scene;
    public readonly sky: Sky;
    public readonly chunkRenderer: BatchedChunkRenderer;
    public readonly meshCache: MeshCache;
    public readonly entityRenderer: EntityRenderer;
    private readonly terrainMaterial: MeshBasicNodeMaterial;
    public readonly targetedBlock = new BlockStateOutline;
    public readonly breakingBlock: BlockBreakOutline;
    public readonly blockBreakParticles: BlockBreakParticleEngine;
    public readonly newChunks = new Map<LineSegments, number>;
    public readonly newChunkMeshGeometry: BufferGeometry;
    public readonly newChunkMeshMaterial: Material;
    public paused: boolean = true;
    public debug: boolean = false;
    public readonly fogFactor: Node<"float">;

    public constructor(
        public readonly world: World,
        textureAtlases: TextureAtlases,
        public readonly camera: PerspectiveCamera,
        assets: Assets
    ) {
        this.fogFactor = positionWorld.distance(cameraPosition).remapClamp(this.fogDistance.mul(0.8), this.fogDistance, 0, 1);
        this.fogFactor = float(0);
        this.terrainMaterial = new MeshBasicNodeMaterial({
            colorNode: Fn(() => {
                const terrainColor = texture(
                    textureAtlases.block.threeTexture, uv()
                ).toVar("terrainColor");

                const faceType = attribute<"uint">("faceType", "uint");
                const lit = faceType.bitAnd(1).greaterThan(0);

                If(terrainColor.a.lessThan(0.5), () => Discard());
                
                const ao = attribute("aoFactor", "float" as const).min(2).div(3).toVar("aoCalculated");

                const shadow = this.sky.createSunShadowNode(normalGeometry).toVar("shadow");
                const fogFactor = this.fogFactor;
                
                const lightColor = createLightColorNode(this.world.lightingManager, shadow, ao).toVar("lightColor");

                If(lit, () => {
                    lightColor.assign(vec3(1, 1, 1));
                });

                return mix(
                    terrainColor.rgb.mul(lightColor),
                    this.sky.fogColor,
                    fogFactor
                );
            })(),
            transparent: true
        });

        this.meshCache = MeshCache.create(blockStateRegistry, getUnknownBlockState().getFullId());
        this.chunkRenderer = new BatchedChunkRenderer(world, this.meshCache, this.terrainMaterial, this.scene);
        this.sky = new VoidSky(assets);
        this.blockBreakParticles = new BlockBreakParticleEngine(this.world, this.meshCache, textureAtlases);
        this.entityRenderer = new EntityRenderer(this.scene, world, this, textureAtlases);
        this.breakingBlock = new BlockBreakOutline(assets);

        this.scene.add(this.targetedBlock.mesh, this.breakingBlock.mesh, this.blockBreakParticles.mesh);

        this.newChunkMeshGeometry = new EdgesGeometry(new BoxGeometry(16, 16, 16));

        this.newChunkMeshMaterial = new LineBasicNodeMaterial({
            color: 0xff0000,
            linewidth: 1,
            transparent: true,
            opacity: 1,
        });

        world.setRenderer(this);
    }

    public setPaused(paused: boolean) {
        this.paused = paused;
    }
    public setDebug(debug: boolean) {
        this.debug = debug;
    }

    public async init() {
        this.sky.create(this.world.seed);
        await this.chunkRenderer.init();
    }

    public getRenderPass(): Node<"vec4"> {
        const sky = this.sky.renderPass;
        const ground = pass(this.scene, this.camera);
        return vec4(mix(sky.rgb, ground.rgb, ground.a), 1);
    }

    public render(time: Time) {
        for(const [ mesh, framesVisible ] of this.newChunks.entries()) {
            if(framesVisible == 0) {
                this.scene.remove(mesh);
                this.newChunks.delete(mesh);
            } else {
                mesh.scale.set(
                    framesVisible / 8,
                    framesVisible / 8,
                    framesVisible / 8,
                )
                this.newChunks.set(mesh, framesVisible - 1);
            }
        }

        this.chunkRenderer.render(time, this.maxChunkUpdates);

        if(this.paused) return;

        this.blockBreakParticles.tick(time);
        this.sky.updateCamera(this.camera);

        this.sky.time.value = this.world.time;
        this.sky.update();
        
        this.entityRenderer.render(time);
    }

    public removeChunk(chunk: Chunk) {
        this.chunkRenderer.deleteChunk(chunk);
    }

    public dispose() {
        this.targetedBlock.dispose();
        this.breakingBlock.dispose();
        this.blockBreakParticles.dispose();

        this.chunkRenderer.dispose();
        this.entityRenderer.dispose();
        
        this.terrainMaterial.dispose();
    }
}