import { Box2, Vector2, Vector3 } from "three";
import type { UniformNode } from "three/webgpu";
import { Side } from "../block/direction";
import type { TextureAtlas } from "../textures/textureAtlas";
import type { World } from "../world/world";
import type { TileFace, TileMesh } from "./chunkMesher";
import { ParticleEngine } from "./particleEngine";

export class BlockBreakParticleEngine extends ParticleEngine {
    private readonly tileMeshes: Map<string, TileMesh>;
    private readonly tileMeshUvRects: Map<string, Box2[]> = new Map;

    public constructor(
        world: World,
        textureAtlas: TextureAtlas,
        skyColor: UniformNode<"vec3", Vector3>,
    ) {
        super(world, textureAtlas.packedTexture, skyColor);

        this.tileMeshes = this.world.renderer!.chunkMesher.tileMeshes;
        for(const [ blockStateId, tileMesh ] of this.tileMeshes) {
            const uvRects = new Set([
                ...tileMesh.north,
                ...tileMesh.east,
                ...tileMesh.south,
                ...tileMesh.west,
                ...tileMesh.up,
                ...tileMesh.down
            ]
            .map(face => new Box2(
                new Vector2(
                    Math.min(face.u0, face.u1, face.u2, face.u3),
                    Math.min(face.v0, face.v1, face.v2, face.v3)
                ),
                new Vector2(
                    Math.max(face.u0, face.u1, face.u2, face.u3),
                    Math.max(face.v0, face.v1, face.v2, face.v3)
                )
            )));

            if(uvRects.size == 0) continue;
            this.tileMeshUvRects.set(blockStateId, Array.from(uvRects));
        }
    }

    private randomUvPosition(
        minU: number, minV: number,
        maxU: number, maxV: number,
        slice: number
    ): [ number, number, number, number ] {
        slice *= (maxU - minU);
        const x = Math.random() * (1 - slice) * (maxU - minU);
        const y = Math.random() * (1 - slice) * (maxV - minV);

        return [
            minU + x, minV + y,
            minU + x + slice, minV + y + slice,
        ]
    }

    public blockDestructionParticles(
        x: number, y: number, z: number,
        tile: string = this.world.tiles.getBlockStateId(x, y, z),
        density: number = 1
    ) {
        const uvRects = this.tileMeshUvRects.get(tile);
        if(uvRects == null) return;

        for(let dx = 0.125; dx <= 0.875; dx += 0.25) {
            for(let dy = 0.125; dy <= 0.875; dy += 0.25) {
                for(let dz = 0.125; dz <= 0.875; dz += 0.25) {
                    if(Math.random() > density) continue;
                    
                    const randomRect = uvRects[(Math.random() * uvRects.length) | 0]!;

                    this.addParticle(
                        x + dx, y + dy, z + dz,
                        Math.random() * 4 - 2,
                        Math.random() * 4,
                        Math.random() * 4 - 2,
                        ...this.randomUvPosition(
                            randomRect.min.x, randomRect.min.y,
                            randomRect.max.x, randomRect.max.y,
                            0.25
                        ),
                        0.1 + Math.random() * 0.05, // size
                        -20, // gravity
                        0.5 + Math.random() * 1.5 // life
                    );
                }
            }
        }
    }

    public blockParticle(
        x: number, y: number, z: number,
        vx: number, vy: number, vz: number,
        face: Side, tileMesh?: TileMesh
    ) {
        if(tileMesh == null) {
            const tile = this.world.tiles.getBlockStateId(Math.floor(x), Math.floor(y), Math.floor(z));
            tileMesh = this.tileMeshes.get(tile);

            if(tileMesh == null) return;
        }
        let tileFace: TileFace | undefined;

        switch(face) {
            case Side.NORTH:
                tileFace = tileMesh.north[(Math.random() * tileMesh.north.length) | 0];
                break;
            case Side.EAST:
                tileFace = tileMesh.east[(Math.random() * tileMesh.east.length) | 0];
                break;
            case Side.SOUTH:
                tileFace = tileMesh.south[(Math.random() * tileMesh.south.length) | 0];
                break;
            case Side.WEST:
                tileFace = tileMesh.west[(Math.random() * tileMesh.west.length) | 0];
                break;
            case Side.UP:
                tileFace = tileMesh.up[(Math.random() * tileMesh.up.length) | 0];
                break;
            case Side.DOWN:
                tileFace = tileMesh.down[(Math.random() * tileMesh.down.length) | 0];
                break;
        }

        if(tileFace == null) return;
        
        this.addParticle(
            x, y, z, vx, vy, vz,
            ...this.randomUvPosition(
                Math.min(tileFace.u0, tileFace.u1, tileFace.u2, tileFace.u3),
                Math.min(tileFace.v0, tileFace.v1, tileFace.v2, tileFace.v3),
                Math.max(tileFace.u0, tileFace.u1, tileFace.u2, tileFace.u3),
                Math.max(tileFace.v0, tileFace.v1, tileFace.v2, tileFace.v3),
                0.25
            ),
            0.1 + Math.random() * 0.05, // size
            -20, // gravity
            0.5 + Math.random() * 1.5 // life
        );
    }
}