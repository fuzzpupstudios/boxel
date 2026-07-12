class Touch {
    public dx = 0;
    public dy = 0;

    public constructor(
        public readonly id: number,
        public readonly start: number,
        public uiTouch: boolean,
        public x = 0,
        public y = 0
    ) {}

    public get duration() {
        return performance.now() / 1000 - this.start;
    }
}

export class TouchController {
    public static readonly POINTER_ID = -1;
    public readonly touches = new Array<Touch>;
    public readonly justStartedTouches = new Array<Touch>;
    public readonly justEndedTouches = new Array<Touch>;
    
    public constructor(
        private readonly isTouchingGui: (x: number, y: number) => boolean
    ) {}

    public addListeners(element: HTMLElement) {
        element.addEventListener("touchstart", event => {
            for(const eventTouch of event.changedTouches) {
                this.startTouch(eventTouch.identifier, eventTouch.clientX, eventTouch.clientY);
            }
        });
        // element.addEventListener("pointerdown", event => {
        //     this.endTouch(TouchController.POINTER_ID);
        //     this.startTouch(TouchController.POINTER_ID, event.clientX, event.clientY);
        // });

        element.addEventListener("touchmove", event => {
            for(const eventTouch of event.changedTouches) {
                this.moveTouch(eventTouch.identifier, eventTouch.clientX, eventTouch.clientY);
            }
        });
        // element.addEventListener("pointermove", event => {
        //     this.moveTouch(TouchController.POINTER_ID, event.clientX, event.clientY);
        // });

        const endedCallback = (event: TouchEvent) => {
            for(const eventTouch of event.changedTouches) {
                this.endTouch(eventTouch.identifier);
            }
        };
        element.addEventListener("touchcancel", endedCallback);
        element.addEventListener("touchend", endedCallback);
        // element.addEventListener("pointerup", event => {
        //     this.endTouch(TouchController.POINTER_ID);
        // });
    }

    private startTouch(id: number, x: number, y: number) {        
        const touch = new Touch(
            id,
            performance.now() / 1000,
            this.isTouchingGui(x, y),
            x, y
        );
        this.touches.push(touch);
        this.justStartedTouches.push(touch);
    }
    private moveTouch(id: number, x: number, y: number) {
        const touch = this.findTouch(id);
        if(touch == null) return;

        touch.dx += x - touch.x;
        touch.dy += y - touch.y;
        touch.x = x;
        touch.y = y;
    }
    private endTouch(id: number) {
        const touch = this.findTouch(id);
        if(touch == null) return;

        this.touches.splice(this.touches.indexOf(touch), 1);
        this.justEndedTouches.push(touch);
    }

    private findTouch(id: number) {
        return this.touches.find(t => t.id == id);
    }

    public get touching() {
        return this.touches.length > 0;
    }

    public get startTime() {
        return this.touches.at(-1)?.start ?? 0;
    }
    public get duration() {
        return this.touches.at(-1)?.duration ?? 0;
    }
    public get x() {
        return this.touches.at(-1)?.x ?? 0;
    }
    public get y() {
        return this.touches.at(-1)?.y ?? 0;
    }
    public get dx() {
        return this.touches.at(-1)?.dx ?? 0;
    }
    public get dy() {
        return this.touches.at(-1)?.dy ?? 0;
    }

    public startTimeAt(id: number) {
        return this.findTouch(id)?.start ?? 0;
    }
    public durationAt(id: number) {
        return this.findTouch(id)?.duration ?? 0;
    }
    public xAt(id: number) {
        return this.findTouch(id)?.x ?? 0;
    }
    public yAt(id: number) {
        return this.findTouch(id)?.y ?? 0;
    }
    public dxAt(id: number) {
        return this.findTouch(id)?.dx ?? 0;
    }
    public dyAt(id: number) {
        return this.findTouch(id)?.dy ?? 0;
    }

    public startedTouching() {
        return this.justStartedTouches.length > 0;
    }
    public endedTouching() {
        return this.justEndedTouches.length > 0;
    }

    public update() {
        this.justStartedTouches.splice(0);
        this.justEndedTouches.splice(0);
        for(const touch of this.touches) {
            touch.dx = 0;
            touch.dy = 0;
        }
    }
}