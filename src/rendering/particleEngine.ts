import { DynamicDrawUsage, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, Texture } from "three";
import { attribute, billboarding, float, positionGeometry, texture, uv } from "three/tsl";
import { MeshBasicNodeMaterial, Node } from "three/webgpu";
import { blockStateRegistry, tileRegistry } from "../block/blockRegistry";
import type { TileCollider } from "../entity/entity";
import type { Time } from "../time";
import type { World } from "../world/world";
import { createLightColorNode } from "./lightUtils";

export class ParticleEngine {
    public static readonly MAX_PARTICLES = 65535;

    private readonly positions = new Float32Array(ParticleEngine.MAX_PARTICLES * 3);
    private readonly lighting: Float32Array[];
    private readonly sizes = new Float32Array(ParticleEngine.MAX_PARTICLES);
    private readonly uvRects = new Float32Array(ParticleEngine.MAX_PARTICLES * 4);

    /*
     * x velocity (0)  y velocity (2)  z velocity (2)
     * gravity    (3)
      * life       (4)
      * stopped    (5)
     */
    private readonly physics = new Float32Array(ParticleEngine.MAX_PARTICLES * 6);

    private readonly tileColliders: Map<string, TileCollider>;
    private readonly colliderCounts: Map<string, number>;
    private readonly geometry: InstancedBufferGeometry;
    public readonly mesh: Mesh;
    
    private readonly positionAttr: InstancedBufferAttribute;
    private readonly lightingAttr: InstancedBufferAttribute[];
    private readonly sizeAttr: InstancedBufferAttribute;
    private readonly uvRectAttr: InstancedBufferAttribute;
    private readonly lightChannelCount: number;

    public particleCount = 0;
    public drag = 0.98;

    public constructor(
        public readonly world: World,
        private readonly particleTexture: Texture,
        options?: Partial<{
            drag: number
        }>
    ) {
        if(options) {
            if(options.drag != null) {
                this.drag = options.drag;
            }
        }

        this.tileColliders = new Map;
        for(const blockStateKey of tileRegistry.values()) {
            const blockState = blockStateRegistry.get(blockStateKey)!;
            
            this.tileColliders.set(blockStateKey, blockState.collider);
        }

        this.colliderCounts = new Map();

        for(const [ blockStateId, tileCollider ] of this.tileColliders) {
            this.colliderCounts.set(blockStateId, tileCollider.hitboxes.length);
        }

        this.geometry = new InstancedBufferGeometry();

        this.geometry.setAttribute("position", new Float32BufferAttribute([
            -0.5, -0.5, 0,
            0.5, -0.5, 0,
            0.5, 0.5, 0,
            -0.5, 0.5, 0
        ], 3));
        this.geometry.setAttribute("uv", new Float32BufferAttribute([
            0, 0,
            1, 0,
            1, 1,
            0, 1,
        ], 2));
        this.geometry.setIndex([ 0, 1, 2, 2, 3, 0 ]);

        this.lightChannelCount = world.lighting.lightChannels.length;
        this.lighting = [];
        this.lightingAttr = [];
        for(let i = 0; i < this.lightChannelCount; i++) {
            const array = new Float32Array(ParticleEngine.MAX_PARTICLES);
            const attribute = new InstancedBufferAttribute(array, this.lightChannelCount);
            attribute.setUsage(DynamicDrawUsage);

            this.lighting.push(array);
            this.lightingAttr.push(attribute);

            this.geometry.setAttribute("light" + i, attribute);
        }

        this.positionAttr = new InstancedBufferAttribute(this.positions, 3);
        this.sizeAttr = new InstancedBufferAttribute(this.sizes, 1);
        this.uvRectAttr = new InstancedBufferAttribute(this.uvRects, 4);

        this.positionAttr.setUsage(DynamicDrawUsage);
        this.sizeAttr.setUsage(DynamicDrawUsage);
        this.uvRectAttr.setUsage(DynamicDrawUsage);
        
        this.geometry.setAttribute("particlePosition", this.positionAttr);
        this.geometry.setAttribute("particleSize", this.sizeAttr);
        this.geometry.setAttribute("particleUvRect", this.uvRectAttr);

        this.geometry.instanceCount = 0;

        {
            const particlePosition = attribute("particlePosition", "vec3");
            const particleSize = attribute("particleSize", "float") as any;
            const particleUvRect = attribute("particleUvRect", "vec4") as any;

            const particleUv = particleUvRect.xy.add(
                uv().mul(particleUvRect.zw.sub(particleUvRect.xy))
            ).toVar("particleUv");
            const particleColor = texture(this.particleTexture, particleUv)
                .mul(createLightColorNode(this.world.lighting, float(1))).toVar("particleColor");

            this.mesh = new Mesh(this.geometry, new MeshBasicNodeMaterial({
                vertexNode: billboarding({
                    position: particlePosition,
                    horizontal: true,
                    vertical: true,
                }),
                positionNode: positionGeometry.mul(particleSize),
                colorNode: particleColor,
                transparent: true,
                depthWrite: false,
            }));
            this.mesh.frustumCulled = false;
            this.mesh.renderOrder = 1;
        }
    }

    private updateLight(index: number) {
        const lightChannelCount = this.lightChannelCount;

        for(let i = 0; i < lightChannelCount; i++) {
            this.lighting[i]![index] = this.world.lighting.lightChannels[i]!.get(
                Math.floor(this.positions[index * 3]!),
                Math.floor(this.positions[index * 3 + 1]!),
                Math.floor(this.positions[index * 3 + 2]!),
            )
        }
    }

    public addParticle(
        x: number, y: number, z: number,
        vx: number, vy: number, vz: number,
        minU: number, minV: number,
        maxU: number, maxV: number,
        size: number,
        gravity: number,
        life: number
    ) {
        if(this.particleCount >= ParticleEngine.MAX_PARTICLES) {
            this.killParticle((Math.random() * this.particleCount) | 0);
        }

        this.positions[this.particleCount * 3 + 0] = x;
        this.positions[this.particleCount * 3 + 1] = y;
        this.positions[this.particleCount * 3 + 2] = z;
        this.sizes[this.particleCount] = size;
        
        this.uvRects[this.particleCount * 4 + 0] = minU;
        this.uvRects[this.particleCount * 4 + 1] = minV;
        this.uvRects[this.particleCount * 4 + 2] = maxU;
        this.uvRects[this.particleCount * 4 + 3] = maxV;

        this.physics[this.particleCount * 6 + 0] = vx;
        this.physics[this.particleCount * 6 + 1] = vy;
        this.physics[this.particleCount * 6 + 2] = vz;
        this.physics[this.particleCount * 6 + 3] = gravity;
        this.physics[this.particleCount * 6 + 4] = life;
        this.physics[this.particleCount * 6 + 5] = 0;

        this.updateLight(this.particleCount);

        this.particleCount++;

        this.geometry.instanceCount = this.particleCount;
        this.uvRectAttr.needsUpdate = true;
        this.sizeAttr.needsUpdate = true;
        this.positionAttr.needsUpdate = true;
    }

    public tick(time: Time) {
        let positionIndex = 0;
        let physicsIndex = 0;
        let tile: string;
        let x = 0, y = 0, z = 0;
        let life = 0;

        const dt = time.deltaTime;
        const dt60 = dt * 60;
        const worldTiles = this.world.tiles;

        for(let i = 0; i < this.particleCount; i++, positionIndex += 3, physicsIndex += 6) {
            // Life
            life = this.physics[physicsIndex + 4]! -= dt;
            if(life < 0) {
                this.killParticle(i);
                i--;
                positionIndex -= 3;
                physicsIndex -= 6;
                continue;
            }

            this.updateLight(i);

            if(this.physics[physicsIndex + 5]) continue;

            x = this.positions[positionIndex + 0]! += this.physics[physicsIndex + 0]! * dt;
            y = this.positions[positionIndex + 1]! += this.physics[physicsIndex + 1]! * dt;
            z = this.positions[positionIndex + 2]! += this.physics[physicsIndex + 2]! * dt;

            // Velocity & tile fetching
            tile = worldTiles.getBlockStateId(Math.floor(x), Math.floor(y), Math.floor(z));

            // Check if particle collides with any tiles
            if(this.colliderCounts.get(tile)) {
                const hitboxes = this.tileColliders.get(tile)!.hitboxes;

                for(let j = 0; j < hitboxes.length; j++) {
                    if(x - Math.floor(x) > hitboxes[j]!.max.x) continue;
                    if(y - Math.floor(y) > hitboxes[j]!.max.y) continue;
                    if(z - Math.floor(z) > hitboxes[j]!.max.z) continue;
                    if(x - Math.floor(x) < hitboxes[j]!.min.x) continue;
                    if(y - Math.floor(y) < hitboxes[j]!.min.y) continue;
                    if(z - Math.floor(z) < hitboxes[j]!.min.z) continue;

                    this.positions[positionIndex + 0]! -= this.physics[physicsIndex + 0]! * dt;
                    this.positions[positionIndex + 1]! -= this.physics[physicsIndex + 1]! * dt;
                    this.positions[positionIndex + 2]! -= this.physics[physicsIndex + 2]! * dt;
                    this.physics[physicsIndex + 5] = 1;
                    break;
                }
            }

            // Drag and gravity
            const dragFactor = Math.max(0, 1 - (1 - this.drag) * dt60);

            this.physics[physicsIndex + 0]! *= dragFactor;
            this.physics[physicsIndex + 1]! += this.physics[physicsIndex + 3]! * dt;
            this.physics[physicsIndex + 2]! *= dragFactor;
        }

        this.positionAttr.needsUpdate = true;
        this.sizeAttr.needsUpdate = true;
    }

    private killParticle(index: number) {
        const last = this.particleCount - 1;
        if(last < 0) return;

        if(index !== last) {
            for(let i = 0; i < 3; i++) {
                this.positions[index * 3 + i] = this.positions[last * 3 + i]!;
            }
            this.sizes[index] = this.sizes[last]!;
            for(let i = 0; i < 4; i++) {
                this.uvRects[index * 4 + i] = this.uvRects[last * 4 + i]!;
            }
            for(let i = 0; i < 6; i++) {
                this.physics[index * 6 + i] = this.physics[last * 6 + i]!;
            }
        }

        this.particleCount--;

        this.geometry.instanceCount = this.particleCount;
        this.sizeAttr.needsUpdate = true;
        this.uvRectAttr.needsUpdate = true;
    }
}