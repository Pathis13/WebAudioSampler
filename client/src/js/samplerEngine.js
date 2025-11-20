import { loadAndDecodeSound } from './soundutils.js';
import { playSound } from './soundutils.js';

export class SamplerEngine {
    constructor() {
        this.ctx = new AudioContext();
        this.PRESETS_URL = 'http://localhost:3000/presets';
    }

    async loadPresetSamples(preset) {
        let soundURLs = []
        let decodedSounds = []
        preset.samples.forEach(element => {
            let url = this.PRESETS_URL + "/" + element.url.replace("./", "").replaceAll(" ", "%20")
            soundURLs.push(url)
        });
            
        let promises = soundURLs.map(url => loadAndDecodeSound(url, this.ctx));
        decodedSounds = await Promise.all(promises);
        return decodedSounds
    }

    playSoundById(id, decodedSounds){
        playSound(this.ctx, decodedSounds[id], 0, decodedSounds[id].duration);
    }

    // play a Sound object
    playSound(sound){
        sound.play(this.ctx);
    }
}