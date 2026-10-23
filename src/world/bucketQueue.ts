export class BucketQueue<T extends WeakKey> {
    protected readonly buckets = new Array<Set<T>>;
    protected itemOrders = new WeakMap<T, number>;
    protected smallestBucket = 0;
    protected biggestBucket = 0;
    public size = 0;

    constructor(
        public readonly bucketArea: number = 2,
        public readonly bucketCount: number = 100
    ) {
        if(bucketArea <= 0) throw new RangeError("Bucket area must be greater than 0");

        for(let i = 0; i < this.bucketCount; i++) {
            this.buckets.push(new Set);
        }
        this.biggestBucket = this.bucketCount - 1;
    }

    public has(object: T) {
        return this.itemOrders.has(object);
    }

    public add(value: number, object: T) {
        let order = 1;
        while(value / (order * order) > this.bucketArea && order < this.bucketCount - 1) {
            order++;
        }

        const oldOrder = this.itemOrders.get(object);
        if(oldOrder == null) {
            this.size++;
        } else {
            if(oldOrder === order) {
                return;
            } else {
                this.buckets[oldOrder].delete(object);
            }
        }

        if(order < this.smallestBucket) this.smallestBucket = order;
        if(order > this.biggestBucket) this.biggestBucket = order;

        this.itemOrders.set(object, order);
        this.buckets[order].add(object);
    }

    public *[Symbol.iterator]() {
        for(let i = 0; i < this.bucketCount; i++) {
            yield* this.buckets[i];
        }
    }

    public delete(item: T) {
        const order = this.itemOrders.get(item);
        if(order == null) return false;

        const bucket = this.buckets[order]!;
        bucket.delete(item);
        this.itemOrders.delete(item);

        this.size--;
        return true;
    }

    public clear() {
        for(let i = 0; i < this.bucketCount; i++) {
            this.buckets[i].clear();
        }
        this.smallestBucket = 0;
        this.biggestBucket = 0;
        this.itemOrders = new WeakMap;
        this.size = 0;
    }

    public shift(): T | null {
        const bucket = this.buckets[this.smallestBucket];

        if(bucket.size == 0) {
            if(this.smallestBucket === this.bucketCount - 1) {
                return null;
            } else {
                this.smallestBucket++;
                return this.shift();
            }
        }

        const value = bucket.values().next().value!;
        bucket.delete(value);
        this.itemOrders.delete(value);
        this.size--;
        return value;
    }

    public shiftPeek(): T | null {
        const bucket = this.buckets[this.smallestBucket];

        if(bucket.size == 0) {
            if(this.smallestBucket === this.bucketCount - 1) {
                return null;
            } else {
                this.smallestBucket++;
                return this.shiftPeek();
            }
        }

        return bucket.values().next().value!;
    }

    public pop(): T | null {
        const bucket = this.buckets[this.biggestBucket];

        if(bucket.size == 0) {
            if(this.biggestBucket === 0) {
                return null;
            } else {
                this.biggestBucket--;
                return this.pop();
            }
        }

        const value = bucket.values().next().value!;
        bucket.delete(value);
        this.itemOrders.delete(value);
        this.size--;
        return value;
    }
}