import { loadPresetSamples } from './samplerEngine2.js';
import { playSound } from './soundutils.js';

// The AudioContext object is the main "entry point" into the Web Audio API
let ctx;

const API_BASE = 'http://localhost:3000';

// let sounds = []
let decodedSounds = []

window.activeSoundIndex = 0;

window.onload = async function init() {
    ctx = new AudioContext();
    
    // sounds = new Array(16).fill(null);
    
    const presetSelect = document.querySelector('#presetSelect');


    let presets = [];
    try {
        const resp = await fetch(`${API_BASE}/api/presets`);
        presets = await resp.json();
    } catch (e) {
        console.error('Erreur en récupérant les presets :', e);
        presets = [];
    }


    presetSelect.innerHTML = '<option value="-1">Blank</option>';
    presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = p.name;
        presetSelect.appendChild(opt);
    });

    presetSelect.onchange = async function (e) {
        if (this.value >= 0){
            decodedSounds = await loadPresetSamples(presets[this.value], ctx)
            // playSound(ctx, decodedSounds[0], 0, decodedSounds[0].duration);
        }
    }

    
    
    // bouton pour test sans interface qui charge le premier preset et joue le kick
    let headlessBtn = document.getElementById("headless")
    headlessBtn.addEventListener('click', async () => {
        decodedSounds = await loadPresetSamples(presets[0], ctx)
        playSound(ctx, decodedSounds[0], 0, decodedSounds[0].duration);
    })
}