import { Matrix4, Vector3, type Box3, type Vector2 } from "three";

export class TileCollider {
    public readonly hitboxes = new Array<Box3>;

    public clone(): TileCollider {
        const collider = new TileCollider;

        for(const hitbox of this.hitboxes) {
            collider.hitboxes.push(hitbox.clone());
        }

        return collider;
    }

    public snap(grid = 1/4096) {
        for(const { min, max } of this.hitboxes) {
            for(const point of [ min, max ]) {
                point.x = Math.round(point.x / grid) * grid;
                point.y = Math.round(point.y / grid) * grid;
                point.z = Math.round(point.z / grid) * grid;
            }
        }
    }

    public translate(x: number, y: number, z: number) {
        const offset = new Vector3(x, y, z);

        for(const hitbox of this.hitboxes) hitbox.translate(offset);
    }

    public scale(x: number, y: number, z: number, anchor: Vector3) {
        this.applyMatrix(new Matrix4().makeScale(x, y, z), anchor);
    }

    public slice(section: Box3) {
        for(const hitbox of this.hitboxes.splice(0)) {
            const newBox = section.clone();

            newBox.min.max(hitbox.min);
            newBox.max.min(hitbox.max);

            if(newBox.min.x > newBox.max.x || newBox.min.y > newBox.max.y || newBox.min.z > newBox.max.z) continue;
            this.hitboxes.push(newBox);
        }
    }

    public rotateX(count: number, pivot: Vector2) {
        this.applyMatrix(
            new Matrix4().makeRotationX(Math.PI * -0.5 * count),
            new Vector3(0, pivot.y, 1 - pivot.x)
        );
    }
    public rotateY(count: number, pivot: Vector2) {
        this.applyMatrix(
            new Matrix4().makeRotationY(Math.PI * -0.5 * count),
            new Vector3(pivot.x, 0, 1 - pivot.y)
        );
    }
    public rotateZ(count: number, pivot: Vector2) {
        this.applyMatrix(
            new Matrix4().makeRotationZ(Math.PI * -0.5 * count),
            new Vector3(pivot.x, pivot.y, 0)
        );
    }
    public applyMatrix(matrix: Matrix4, pivot: Vector3) {
        const fromCentered = pivot.clone();
        const toCentered = pivot.clone().multiplyScalar(-1);
        
        for(const hitbox of this.hitboxes) {
            hitbox.translate(toCentered);
            hitbox.applyMatrix4(matrix);
            hitbox.translate(fromCentered);
        }
    }
}