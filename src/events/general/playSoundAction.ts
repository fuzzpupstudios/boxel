import z from "zod";
import type { AudioManager } from "../../data/audioManager";
import { EventAction } from "../eventAction";
import type { EventCursor, EventSheet } from "../eventSheet";

type SoundEntry2d = z.infer<typeof SoundEntry2d>;
const SoundEntry2d = z.object({
    name: z.string(),
    pitch: z.union([ z.number(), z.tuple([ z.number(), z.number() ]) ]).default(1),
    volume: z.union([ z.number(), z.tuple([ z.number(), z.number() ]) ]).default(1),
    weight: z.number().default(1),
});

type SoundEntry3d = z.infer<typeof SoundEntry3d>;
const SoundEntry3d = SoundEntry2d.extend({
    distanceModel: z.enum([
        "linear" as const,
        "inverse" as const,
        "exponential" as const
    ]).default("exponential"),
    maxDistance: z.number().default(32),
    refDistance: z.number().default(4),
    rolloffFactor: z.number().default(1)
});

export type PlaySoundActionParameters = z.infer<typeof PlaySoundActionParameters>;
export const PlaySoundActionParameters = z.union([
    z.object({
        spatial: z.literal(true),
        xOffset: z.number().default(0),
        yOffset: z.number().default(0),
        zOffset: z.number().default(0),
        useEntityPosition: z.boolean().default(false),
        useHitPosition: z.boolean().default(false),
        sound: z.union([
            z.string(),
            SoundEntry3d,
            z.array(z.union([
                z.string(),
                SoundEntry3d
            ]))
        ])
    }),
    z.object({
        spatial: z.literal(false).optional(),
        sound: z.union([
            z.string(),
            SoundEntry2d,
            z.array(z.union([
                z.string(),
                SoundEntry2d
            ]))
        ])
    }),
]);

class PlaySound2d {
    public readonly sound: string;
    public readonly minPitch: number;
    public readonly pitchRange: number;
    public readonly minVolume: number;
    public readonly volumeRange: number;

    public constructor(
        data: SoundEntry2d,
        public readonly weightIndex: number
    ) {
        this.sound = data.name;

        if(typeof data.pitch == "number") {
            this.minPitch = data.pitch;
            this.pitchRange = 0;
        } else {
            this.minPitch = data.pitch[0];
            this.pitchRange = data.pitch[1] - data.pitch[0];
        }
        if(typeof data.volume == "number") {
            this.minVolume = data.volume;
            this.volumeRange = 0;
        } else {
            this.minVolume = data.volume[0];
            this.volumeRange = data.volume[1] - data.volume[0];
        }
    }

    public play2d(audioManager: AudioManager) {
        const sound = audioManager.playSound2d(this.sound);
        if(sound == null) return;

        sound.setPlaybackRate(this.minPitch + Math.random() * this.pitchRange);
        sound.setVolume(this.minVolume + Math.random() * this.volumeRange);
    }
}

class PlaySound3d extends PlaySound2d {
    public readonly distanceModel: "linear" | "inverse" | "exponential";
    public readonly maxDistance: number;
    public readonly refDistance: number;
    public readonly rolloffFactor: number;

    public constructor(data: SoundEntry3d, weightIndex: number) {
        super(data, weightIndex);
        
        this.distanceModel = data.distanceModel;
        this.maxDistance = data.maxDistance;
        this.refDistance = data.refDistance;
        this.rolloffFactor = data.rolloffFactor;
    }

    public play3d(audioManager: AudioManager, x: number, y: number, z: number) {
        const sound = audioManager.playSound3d(this.sound, x, y, z);
        if(sound == null) return;

        sound.setPlaybackRate(this.minPitch + Math.random() * this.pitchRange);
        sound.setVolume(this.minVolume + Math.random() * this.volumeRange);
        sound.setMaxDistance(this.maxDistance);
        sound.setRefDistance(this.refDistance);
        sound.setRolloffFactor(this.rolloffFactor);
    }
}

export class PlaySoundAction extends EventAction<PlaySoundActionParameters> {
    private readonly soundList = new Array<PlaySound2d>;
    
    public constructor(eventSheet: EventSheet, args: PlaySoundActionParameters) {
        super(eventSheet, PlaySoundActionParameters.parse(args));

        let sounds = this.args.sound;
        if(!(sounds instanceof Array)) sounds = [ sounds ];

        for(let i = 0; i < sounds.length; i++) {
            if(typeof sounds[i] !== "string") continue;

            if(this.args.spatial) {
                sounds[i] = SoundEntry3d.parse({ name: sounds[i] });
            } else {
                sounds[i] = SoundEntry2d.parse({ name: sounds[i] });
            }
        }

        const weightSum = (<SoundEntry2d[]>sounds).reduce((p, c) => p + c.weight, 0);

        let cumulativeWeight = 0;
        for(const json of <SoundEntry2d[]>sounds) {
            const weightIndex = (cumulativeWeight + json.weight) / weightSum;
            cumulativeWeight += json.weight;

            let sound: PlaySound2d;
            if(this.args.spatial) {
                sound = new PlaySound3d(<SoundEntry3d>json, weightIndex);
            } else {
                sound = new PlaySound2d(<SoundEntry2d>json, weightIndex);
            }

            this.soundList.push(sound);
        }
    }
    public override run(cursor: EventCursor): void {
        if(cursor.clientPlatform == null) return;

        let sound: PlaySound2d;

        if(this.soundList.length == 1) {
            sound = this.soundList[0]!;
        } else {
            const weightThreshold = Math.random();
            let soundIndex = 0;

            do {
                sound = this.soundList[soundIndex++]!;
            } while(
                sound.weightIndex < weightThreshold &&
                soundIndex < this.soundList.length
            )
        }

        if(this.args.spatial) {
            let x = this.args.xOffset;
            let y = this.args.yOffset;
            let z = this.args.zOffset;

            if(this.args.useEntityPosition && cursor.entity != null) {
                x += cursor.entity?.position.x,
                y += cursor.entity?.position.y,
                z += cursor.entity?.position.z
            } else if(this.args.useHitPosition && cursor.entity != null) {
                x += cursor.voxelHitX,
                y += cursor.voxelHitY,
                z += cursor.voxelHitZ
            } else {
                x += cursor.x + 0.5,
                y += cursor.y + 0.5,
                z += cursor.z + 0.5
            }
            (<PlaySound3d>sound).play3d(cursor.clientPlatform.audioManager, x, y, z);
        } else {
            sound.play2d(cursor.clientPlatform.audioManager);
        }
    }
}