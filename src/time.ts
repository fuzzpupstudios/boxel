export class Time {
    public static fromMsDifference(lastMs: number, currentMs: number, dtClamp = Infinity) {
        const dt = Math.min(currentMs - lastMs, dtClamp);
        return new Time(
            currentMs / 1000,
            currentMs,
            dt / 1000,
            dt
        )
    }
    public constructor(
        public readonly seconds: number,
        public readonly miliseconds: number,
        public readonly deltaTime: number,
        public readonly deltaMs: number
    ) { }
}