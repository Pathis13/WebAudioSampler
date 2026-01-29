import { loadAndDecodeSound, playSound } from './utils/soundutils.js';

export class SamplerEngine {
    constructor() {
        this.ctx = new AudioContext();
        this.PRESETS_URL = 'http://localhost:3000/presets';
    }

    async loadPresetSamples(preset, updateProgressBar) {
        let soundURLs = []
        let decodedSounds = []
        preset.samples.forEach(element => {
            if (element.url.substring(0,4) == 'http'){
                soundURLs.push(element.url)
            }
            else{
                soundURLs.push(this.PRESETS_URL + "/" + element.url)
            }
        });
        let promises = soundURLs.map((url, index) => loadAndDecodeSound(url, this.ctx, index, updateProgressBar));
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