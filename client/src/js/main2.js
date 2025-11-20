import { samplerGUI } from './samplerGUI2.js';

const API_BASE = 'http://localhost:3000';

let decodedSounds = []

window.activeSoundIndex = 0;


window.onload = async function init() {
    const gui = new samplerGUI();
    const engine = gui.getEngine();

    const presetSelect = document.querySelector('#presetSelect');


    let presets = [];
    try {
        const resp = await fetch(`${API_BASE}/api/presets`);
        presets = await resp.json();
    } catch (e) {
        console.error('Erreur en récupérant les presets :', e);
        presets = [];
    }


    // preset select
    presetSelect.innerHTML = '<option value="-1">Blank</option>';
    presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = p.name;
        presetSelect.appendChild(opt);
    });

    // load preset and show name on buttons when select option
    let presetSamples = []
    presetSelect.onchange = async function (e) {
        gui.clearButtons()
        if (this.value >= 0){
            decodedSounds = await engine.loadPresetSamples(presets[this.value])
            presetSamples = presets[this.value].samples
            gui.nameOnButtons(presetSamples)
            gui.createSounds(decodedSounds);
            gui.bindButtonEvents()
        }
    }
    


    
    
    // bouton pour test sans interface qui charge le premier preset et joue le kick
    let headlessBtn = document.getElementById("headless")
    headlessBtn.addEventListener('click', async () => {
        decodedSounds = await engine.loadPresetSamples(presets[0])
        engine.playSoundById(0, decodedSounds);
    })
}