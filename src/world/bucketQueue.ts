export class BucketQueue<T> {
    private readonly buckets = new Array<T[]>;
    private smallestBucket = 0;
    private biggestBucket = 0;
    public size = 0;

    constructor(
        public readonly bucketArea: number = 0.5,
        public readonly bucketCount: number = 30
    ) {
        if(bucketArea >= 1) throw new RangeError("Bucket area must be less than 1");
        if(bucketArea <= 0) throw new RangeError("Bucket area must be greater than 0");

        for(let i = 0; i < this.bucketCount; i++) {
            this.buckets.push([]);
        }
        this.biggestBucket = this.bucketCount - 1;
    }

    public add(value: number, object: T) {
        let order = 0;
        while(value > 1 && order < this.bucketCount - 1) {
            order++;
            value *= this.bucketArea;
        }

        if(order < this.smallestBucket) this.smallestBucket = order;
        if(order > this.biggestBucket) this.biggestBucket = order;

        this.size++;
        this.buckets[order].push(object);
    }

    public *[Symbol.iterator]() {
        for(let i = 0; i < this.bucketCount; i++) {
            yield* this.buckets[i];
        }
    }

    public clear() {
        for(let i = 0; i < this.bucketCount; i++) {
            this.buckets[i] = [];
        }
        this.size = 0;
    }

    public shift(): T | null {
        const bucket = this.buckets[this.smallestBucket];

        if(bucket.length == 0) {
            if(this.smallestBucket === this.bucketCount - 1) {
                return null;
            } else {
                this.smallestBucket++;
                return this.shift();
            }
        }

        this.size--;
        return bucket.shift()!;
    }

    public pop(): T | null {
        const bucket = this.buckets[this.biggestBucket];

        if(bucket.length == 0) {
            if(this.biggestBucket === 0) {
                return null;
            } else {
                this.biggestBucket--;
                return this.pop();
            }
        }

        this.size--;
        return bucket.pop()!;
    }
}