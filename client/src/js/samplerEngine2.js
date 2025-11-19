import { loadAndDecodeSound } from './soundutils.js';

const PRESETS_URL = 'http://localhost:3000/presets';

async function loadPresetSamples(preset, ctx) {

    let soundURLs = []
    let decodedSounds = []
    preset.samples.forEach(element => {
        let url = PRESETS_URL + "/" + element.url.replace("./", "").replaceAll(" ", "%20")
        soundURLs.push(url)
    });
        
    let promises = soundURLs.map(url => loadAndDecodeSound(url, ctx));
    decodedSounds = await Promise.all(promises);
    return decodedSounds
}

export { loadPresetSamples };