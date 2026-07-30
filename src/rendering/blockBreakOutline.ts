import { Fn } from "three/src/nodes/TSL.js";
import { Discard, If, texture, uniform, uv, vec2 } from "three/tsl";
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Material, Mesh, MeshBasicNodeMaterial, NearestFilter, RepeatWrapping, Texture } from "three/webgpu";
import { getUnknownBlockState } from "../block/blockRegistry";
import { BlockState } from "../block/blockState";
import type { Assets } from "../data/assets";

export class BlockBreakOutline {
    public readonly progress = uniform(0);
    public readonly mesh: Mesh;

    private readonly outlines = new Map<BlockState, BufferGeometry>;
    public currentBlockState: BlockState | null = null;
    private readonly material: Material;

    public constructor(assets: Assets) {
        const blockBreakImage = assets.getTextureOrThrow("base:ui/block_break.png");
        const blockBreakTexture = new Texture(blockBreakImage);
        blockBreakTexture.magFilter = NearestFilter;
        blockBreakTexture.wrapS = RepeatWrapping;
        blockBreakTexture.wrapT = RepeatWrapping;

        blockBreakTexture.needsUpdate = true;

        const cells = blockBreakImage.width / blockBreakImage.height;

        this.material = new MeshBasicNodeMaterial({
            colorNode: Fn(() => {
                If(this.progress.equal(0), () => Discard());

                const newUv = uv()
                    .add(vec2(this.progress.mul(cells).floor().min(cells - 1), 0))
                    .div(vec2(cells, 1));

                return texture(blockBreakTexture, newUv);
            })(),

            transparent: true,
            alphaTest: 0.5,

            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        this.mesh = new Mesh(new BoxGeometry, this.material);
    }

    public setBlockState(state: BlockState) {
        if(state === this.currentBlockState) return;
        if(state == null) state = getUnknownBlockState();

        this.currentBlockState = state;
        const outlineGeometry = this.getOutline(state);

        this.mesh.geometry = outlineGeometry;
    }

    private getOutline(state: BlockState) {
        // Check if outline is already cached
        let geometry = this.outlines.get(state);
        if(geometry != null) return geometry;

        // Otherwise create a new outline
        const positions = new Array;
        const uvs = new Array;
        const indices = new Array;
        let vertexCount = 0;

        for(const face of state.model.faces()) {
            positions.push(face.v0.x, face.v0.y, face.v0.z);
            positions.push(face.v1.x, face.v1.y, face.v1.z);
            positions.push(face.v2.x, face.v2.y, face.v2.z);
            positions.push(face.v3.x, face.v3.y, face.v3.z);

            let u0 = 0, v0 = 0;
            let u1 = 0, v1 = 1;
            let u2 = 1, v2 = 1;
            let u3 = 1, v3 = 0;

            if(face.normal.x === 1) {
                u0 = 1 - face.v0.z; v0 = face.v0.y;
                u1 = 1 - face.v1.z; v1 = face.v1.y;
                u2 = 1 - face.v2.z; v2 = face.v2.y;
                u3 = 1 - face.v3.z; v3 = face.v3.y;
            } else if(face.normal.x === -1) {
                u0 = face.v0.z;     v0 = face.v0.y;
                u1 = face.v1.z;     v1 = face.v1.y;
                u2 = face.v2.z;     v2 = face.v2.y;
                u3 = face.v3.z;     v3 = face.v3.y;
            } else if(face.normal.y === 1) {
                u0 = face.v0.x;     v0 = 1 - face.v0.z;
                u1 = face.v1.x;     v1 = 1 - face.v1.z;
                u2 = face.v2.x;     v2 = 1 - face.v2.z;
                u3 = face.v3.x;     v3 = 1 - face.v3.z;
            } else if(face.normal.y === -1) {
                u0 = face.v0.x;     v0 = face.v0.z;
                u1 = face.v1.x;     v1 = face.v1.z;
                u2 = face.v2.x;     v2 = face.v2.z;
                u3 = face.v3.x;     v3 = face.v3.z;
            } else if(face.normal.z === 1) {
                u0 = face.v0.x;     v0 = face.v0.y;
                u1 = face.v1.x;     v1 = face.v1.y;
                u2 = face.v2.x;     v2 = face.v2.y;
                u3 = face.v3.x;     v3 = face.v3.y;
            } else if(face.normal.z === -1) {
                u0 = 1 - face.v0.x; v0 = face.v0.y;
                u1 = 1 - face.v1.x; v1 = face.v1.y;
                u2 = 1 - face.v2.x; v2 = face.v2.y;
                u3 = 1 - face.v3.x; v3 = face.v3.y;
            }

            uvs.push(
                u0, v0,
                u1, v1,
                u2, v2,
                u3, v3
            );

            indices.push(
                vertexCount + 0, vertexCount + 3, vertexCount + 2,
                vertexCount + 2, vertexCount + 1, vertexCount + 0,
            );
            vertexCount += 4;
        }
        
        geometry = new BufferGeometry;
        geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
        geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        this.outlines.set(state, geometry);

        return geometry;
    }
}