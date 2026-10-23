import { BucketQueue } from "./bucketQueue";

export class DistanceBucketQueue<T extends WeakKey> extends BucketQueue<T> {
    public originX: number = 0;
    public originY: number = 0;
    public originZ: number = 0;

    private positions = new WeakMap<T, [ number, number, number ]>;

    public constructor(
        public updateDistance: number = 16,
        bucketArea?: number,
        bucketCount?: number
    ) {
        super(bucketArea, bucketCount);
    }

    private distance(x: number, y: number, z: number) {
        return (
            (x - this.originX) * (x - this.originX) +
            (y - this.originY) * (y - this.originY) +
            (z - this.originZ) * (z - this.originZ)
        );
    }

    public add(value: number, object: T): void {
        throw new Error("Use addPos() to add items to DistanceBucketQueue");
    }

    public addPos(object: T, x: number, y: number, z: number): void {
        super.add(this.distance(x, y, z), object);
        this.positions.set(object, [ x, y, z ]);
    }

    public setOrigin(x: number, y: number, z: number) {
        if(this.distance(x, y, z) < this.updateDistance * this.updateDistance) return;

        this.originX = x;
        this.originY = y;
        this.originZ = z;

        this.sort();
    }

    public sort() {
        const items = new Set<T>;

        for(let order = this.smallestBucket; order <= this.biggestBucket; order++) {
            for(const item of this.buckets[order]) items.add(item);
        }

        for(const item of items) {
            const pos = this.positions.get(item)!;

            super.add(this.distance(pos[0], pos[1], pos[2]), item);
        }
    }
}