import { MathUtils, Matrix3, Matrix4, Quaternion, Vector2, Vector3 } from "three/webgpu";
import type { DataDrivenJson } from "../../data/dataDrivenJson";
import { TextureAtlasSlot } from "../../data/textureAtlas";
import type { TileFace } from "../../rendering/chunkMesher";
import { BlockModelVertex } from "./vertex";


export class BlockModelFace {
    public v0 = new BlockModelVertex;
    public v1 = new BlockModelVertex;
    public v2 = new BlockModelVertex;
    public v3 = new BlockModelVertex;
    public rotation = 0;
    public lit = false;
    public textureSlot = "";
    public texture = new TextureAtlasSlot;
    public aoReceiveWeight: number = 1;

    public static parseJson(json: DataDrivenJson.BlockStateModelFace, normal: Vector3): BlockModelFace {
        const face = new BlockModelFace(normal);

        const [ x, y, z ] = json.pos;
        const [ width, height ] = json.size;
        const [ uvMinX, uvMinY, uvMaxX, uvMaxY ] = json.uv;


        const quaternion = new Quaternion();
        quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);

        const origin = new Vector3(x, y, z);
        face.v0.xyz.copy(new Vector3(0, 0).applyQuaternion(quaternion).add(origin));
        face.v1.xyz.copy(new Vector3(0, height).applyQuaternion(quaternion).add(origin));
        face.v2.xyz.copy(new Vector3(width, height).applyQuaternion(quaternion).add(origin));
        face.v3.xyz.copy(new Vector3(width, 0).applyQuaternion(quaternion).add(origin));

        let uv0 = new Vector2(uvMinX, uvMinY);
        let uv1 = new Vector2(uvMinX, uvMaxY);
        let uv2 = new Vector2(uvMaxX, uvMaxY);
        let uv3 = new Vector2(uvMaxX, uvMinY);

        if(json.rotation != null) {
            for(let i = 0; i < (json.rotation + 4) % 4; i++) {
                [ uv0, uv1, uv2, uv3 ] =
                [ uv1, uv2, uv3, uv0 ];
            }
        }
        face.v0.uv.copy(uv0);
        face.v1.uv.copy(uv1);
        face.v2.uv.copy(uv2);
        face.v3.uv.copy(uv3);
        
        face.textureSlot = json.texture;
        face.lit = json.lit ?? face.lit;
        face.aoReceiveWeight = json.aoReceiveWeight ?? (json.lit ? 0 : face.aoReceiveWeight);

        return face;
    }

    public constructor(
        public readonly normal: Vector3
    ) {}
    
    public clone(): any {
        const face = new BlockModelFace(this.normal.clone());
        face.v0 = this.v0.clone();
        face.v1 = this.v1.clone();
        face.v2 = this.v2.clone();
        face.v3 = this.v3.clone();
        
        face.rotation = this.rotation;
        face.lit = this.lit;
        face.texture.copyFrom(this.texture);

        return face;
    }

    public *vertices() {
        yield this.v0;
        yield this.v1;
        yield this.v2;
        yield this.v3;
    }

    public snapVertices(grid = 1/4096) {
        for(const vertex of this.vertices()) {
            vertex.snap(grid);
        }
    }

    public applyMatrix4(matrix: Matrix4) {
        this.normal.applyMatrix4(new Matrix4().extractRotation(matrix));
        this.normal.x = Math.round(this.normal.x * 1024) / 1024;
        this.normal.y = Math.round(this.normal.y * 1024) / 1024;
        this.normal.z = Math.round(this.normal.z * 1024) / 1024;
        this.normal.normalize();

        for(const vertex of this.vertices()) {
            vertex.applyMatrix4(matrix);
        }
    }

    public applyMatrix3(matrix: Matrix3) {
        for(const vertex of this.vertices()) {
            vertex.applyMatrix3(matrix);
        }
    }

    public shouldCull() {
        const planarX = this.v0.x == this.v1.x && this.v1.x == this.v2.x && this.v2.x == this.v3.x;
        const planarY = this.v0.y == this.v1.y && this.v1.y == this.v2.y && this.v2.y == this.v3.y;
        const planarZ = this.v0.z == this.v1.z && this.v1.z == this.v2.z && this.v2.z == this.v3.z;

        return (
            (this.normal.x === 1 && planarX && this.v0.x == 1) ||
            (this.normal.x === -1 && planarX && this.v0.x == 0) ||
            (this.normal.y === 1 && planarY && this.v0.y == 1) ||
            (this.normal.y === -1 && planarY && this.v0.y == 0) ||
            (this.normal.z === 1 && planarZ && this.v0.z == 1) ||
            (this.normal.z === -1 && planarZ && this.v0.z == 0)
        );
    }

    public compile(): TileFace {
        const texturePosition = this.texture.box2;


        // Map the local uv coordinates of the face to the
        // position passed in via setTexturePosition()
        const minU = texturePosition.min.x;
        const minV = texturePosition.max.y;
        const maxU = texturePosition.max.x;
        const maxV = texturePosition.min.y;

        return {
            cull: this.shouldCull(),
            typeMask: 0b00000000 | (+this.lit),
            aoReceiveWeight: this.aoReceiveWeight,

            x0: this.v0.x, y0: this.v0.y, z0: this.v0.z,
            u0: MathUtils.mapLinear(this.v0.u, 0, 1, minU, maxU),
            v0: MathUtils.mapLinear(this.v0.v, 0, 1, minV, maxV),

            x1: this.v1.x, y1: this.v1.y, z1: this.v1.z,
            u1: MathUtils.mapLinear(this.v1.u, 0, 1, minU, maxU),
            v1: MathUtils.mapLinear(this.v1.v, 0, 1, minV, maxV),

            x2: this.v2.x, y2: this.v2.y, z2: this.v2.z,
            u2: MathUtils.mapLinear(this.v2.u, 0, 1, minU, maxU),
            v2: MathUtils.mapLinear(this.v2.v, 0, 1, minV, maxV),

            x3: this.v3.x, y3: this.v3.y, z3: this.v3.z,
            u3: MathUtils.mapLinear(this.v3.u, 0, 1, minU, maxU),
            v3: MathUtils.mapLinear(this.v3.v, 0, 1, minV, maxV)
        }
    }
}