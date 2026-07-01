import type { Vector3Like } from "three";

export class Side {
    public static NORTH = new Side(0, 0, 1);
    public static EAST = new Side(1, 0, 0);
    public static SOUTH = new Side(0, 0, -1);
    public static WEST = new Side(-1, 0, 0);
    public static UP = new Side(0, 1, 0);
    public static DOWN = new Side(0, -1, 0);

    public readonly normal: Readonly<Vector3Like>;
    private constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly z: number
    ) {
        this.normal = { x, y, z };
    }
}