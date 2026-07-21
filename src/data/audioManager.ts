import { Audio, AudioListener, Object3D, PositionalAudio } from "three";
import type { Assets } from "./assets";

export class AudioManager {
    public readonly root = new Object3D;
    public readonly listener = new AudioListener;

    constructor(
        public readonly assets: Assets
    ) {}

    public playMenuClick() {
        return this.playSound2d("base:ui/menu_click");
    }
    public playMenuBack() {
        return this.playSound2d("base:ui/menu_back");
    }

    public playSound2d(id: string) {
        const audioBuffer = this.assets.audioRegistry.get(id);

        if(audioBuffer == null) {
            console.warn("Sound " + id + " does not exist");
            return;
        }

        const audio = new Audio(this.listener);
        audio.setBuffer(audioBuffer);
        audio.play();

        return audio;
    }

    public playSound3d(id: string, x: number, y: number, z: number) {
        const audioBuffer = this.assets.audioRegistry.get(id);

        if(audioBuffer == null) {
            console.warn("Sound " + id + " does not exist");
            return;
        }

        const audio = new PositionalAudio(this.listener);
        audio.setBuffer(audioBuffer);
        audio.setRefDistance(16);
        
        audio.position.set(x, y, z);
        this.root.add(audio);
        
        audio.play();

        return audio;
    }
}