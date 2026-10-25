import z from "zod";
import type { AudioManager } from "../../data/audioManager";
import type { EventAction } from "../eventAction";
import { isNumber, parameter } from "../eventVariable";
import n from "../eventVariableTypes";

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

export type PlaySound2dActionParameters = z.infer<typeof PlaySound2dActionParameters>;
const PlaySound2dActionParameters = z.object({
    spatial: z.literal(false).optional(),
    sound: z.union([
        z.string(),
        SoundEntry2d,
        z.array(z.union([
            z.string(),
            SoundEntry2d
        ]))
    ])
});

export type PlaySound3dActionParameters = z.infer<typeof PlaySound3dActionParameters>;
const PlaySound3dActionParameters = z.object({
    spatial: z.literal(true),
    xOffset: n.Number.default(0),
    yOffset: n.Number.default(0),
    zOffset: n.Number.default(0),
    useEntityPosition: n.Boolean.default(false),
    useHitPosition: n.Boolean.default(false),
    sound: z.union([
        z.string(),
        SoundEntry3d,
        z.array(z.union([
            z.string(),
            SoundEntry3d
        ]))
    ])
});

export type PlaySoundActionParameters = z.infer<typeof PlaySoundActionParameters>;
export const PlaySoundActionParameters = z.union([ PlaySound2dActionParameters, PlaySound3dActionParameters ]);

type SoundPlayer = (audioManager: AudioManager, x: number, y: number, z: number) => void;

function createSoundPlayer<T extends SoundEntry2d | SoundEntry3d>(data: T): SoundPlayer {
    const soundName = data.name;

    let pitchMin = 1, pitchRange = 0;
    let volumeMin = 1, volumeRange = 0;

    if(typeof data.pitch == "number") {
        pitchMin = data.pitch;
        pitchRange = 0;
    } else {
        pitchMin = data.pitch[0];
        pitchRange = data.pitch[1] - data.pitch[0];
    }
    if(typeof data.volume == "number") {
        volumeMin = data.volume;
        volumeRange = 0;
    } else {
        volumeMin = data.volume[0];
        volumeRange = data.volume[1] - data.volume[0];
    }

    if("maxDistance" in data) {
        return (audioManager: AudioManager, x: number, y: number, z: number) => {
            const sound = audioManager.playSound3d(soundName, x, y, z);
            if(sound == null) return;

            sound.setPlaybackRate(pitchMin + Math.random() * pitchRange);
            sound.setVolume(volumeMin + Math.random() * volumeRange);
            sound.setMaxDistance(data.maxDistance);
            sound.setRefDistance(data.refDistance);
            sound.setRolloffFactor(data.rolloffFactor);
        }
    } else {
        return (audioManager: AudioManager) => {
            const sound = audioManager.playSound2d(soundName);
            if(sound == null) return;

            sound.setPlaybackRate(pitchMin + Math.random() * pitchRange);
            sound.setVolume(volumeMin + Math.random() * volumeRange);
        }
    }
}

function createSoundPlayerFromList<T extends SoundEntry2d | SoundEntry3d>(sounds: T | string | (T | string)[], schema: z.ZodSchema<T>): SoundPlayer {
    if(!(sounds instanceof Array)) sounds = [ sounds ];

    for(let i = 0; i < sounds.length; i++) {
        if(typeof sounds[i] !== "string") continue;

        sounds[i] = schema.parse({ name: sounds[i] });
    }

    const weightSum = (<SoundEntry2d[]>sounds).reduce((p, c) => p + c.weight, 0);
    const soundList = new Array<{ weightIndex: number, play: SoundPlayer }>;

    let cumulativeWeight = 0;
    for(const json of <SoundEntry2d[]>sounds) {
        const weightIndex = (cumulativeWeight + json.weight) / weightSum;
        cumulativeWeight += json.weight;

        soundList.push({
            weightIndex,
            play: createSoundPlayer(json)
        });
    }

    if(soundList.length < 1) {
        return soundList[0].play;
    } else {
        return (audioManager, x, y, z) => {
            const weightThreshold = Math.random();
            
            for(const sound of soundList) {
                if(sound.weightIndex >= weightThreshold) return sound.play(audioManager, x, y, z);
            }
            
            return soundList[soundList.length - 1].play(audioManager, x, y, z);
        }
    }
}

export function playSoundAction(args: unknown): EventAction {
    const parsed = PlaySoundActionParameters.parse(args);

    const soundPlayer = createSoundPlayerFromList(parsed.sound, parsed.spatial ? SoundEntry3d : SoundEntry2d);

    if(parsed.spatial) {
        const xOffset = parameter(parsed.xOffset, isNumber);
        const yOffset = parameter(parsed.yOffset, isNumber);
        const zOffset = parameter(parsed.zOffset, isNumber);
        const useEntityPosition = parameter(parsed.useEntityPosition);
        const useHitPosition = parameter(parsed.useHitPosition);

        return cursor => {
            if(!cursor.clientPlatform) return;

            let x = xOffset(cursor);
            let y = yOffset(cursor);
            let z = zOffset(cursor);

            if(useEntityPosition(cursor) && cursor.entity != null) {
                x += cursor.entity?.position.x,
                y += cursor.entity?.position.y,
                z += cursor.entity?.position.z
            } else if(useHitPosition(cursor) && cursor.entity != null) {
                x += cursor.voxelHitX,
                y += cursor.voxelHitY,
                z += cursor.voxelHitZ
            } else {
                x += cursor.x + 0.5,
                y += cursor.y + 0.5,
                z += cursor.z + 0.5
            }
            soundPlayer(cursor.clientPlatform.audioManager, x, y, z);
        }
    } else {
        return cursor => {
            if(!cursor.clientPlatform) return;
            
            soundPlayer(cursor.clientPlatform.audioManager, cursor.x, cursor.y, cursor.z);
        }
    }
}