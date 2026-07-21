import { Matrix3, Matrix4, Vector2, Vector3 } from "three";


export class BlockModelVertex {
    public readonly xyz = new Vector3;
    public readonly uv = new Vector2;

    public set(
        x: number, y: number, z: number,
        u: number, v: number
    ) {
        this.xyz.set(x, y, z);
        this.uv.set(u, v);
    }
    public clone(): BlockModelVertex {
        const vertex = new BlockModelVertex;
        vertex.xyz.copy(this.xyz);
        vertex.uv.copy(this.uv);

        return vertex;
    }

    public get x() {
        return this.xyz.x;
    }
    public set x(x: number) {
        this.xyz.x = x;
    }
    public get y() {
        return this.xyz.y;
    }
    public set y(y: number) {
        this.xyz.y = y;
    }
    public get z() {
        return this.xyz.z;
    }
    public set z(z: number) {
        this.xyz.z = z;
    }

    public get u() {
        return this.uv.x;
    }
    public set u(u: number) {
        this.uv.x = u;
    }
    public get v() {
        return this.uv.y;
    }
    public set v(v: number) {
        this.uv.y = v;
    }

    public applyMatrix4(matrix: Matrix4) {
        this.xyz.applyMatrix4(matrix);
    }
    public applyMatrix3(matrix: Matrix3) {
        this.uv.applyMatrix3(matrix);
    }

    public snap(grid: number) {
        this.x = Math.round(this.x / grid) * grid;
        this.y = Math.round(this.y / grid) * grid;
        this.z = Math.round(this.z / grid) * grid;
    }
}