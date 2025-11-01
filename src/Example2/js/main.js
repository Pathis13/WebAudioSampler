// About imports and exports in JavaScript modules
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export

// default imports of classes from waveformdrawer.js and trimbarsdrawer.js
import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import Sound from './sound.js';
// "named" imports from utils.js and soundutils.js
import { loadAndDecodeSound } from './soundutils.js';

// The AudioContext object is the main "entry point" into the Web Audio API
let ctx;

const API_BASE = 'http://localhost:3000';
// const API_BASE_PRESETS = 'http://localhost:3000/presets';

// small helper to build absolute URL for a sample returned by the API
function resolveSampleUrl(url) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // url is probably like /presets/Folder/file.wav
    return API_BASE +"/presets" + (url.startsWith('/') ? url : '/' + url);
}


let canvas, canvasOverlay;
// waveform drawer is for drawing the waveform in the canvas
// trimbars drawer is for drawing the trim bars in the overlay canvas

let sounds = []
let mousePos = { x: 0, y: 0 }
// index of the currently active sound (shared between handlers and animate)
let activeSoundIndex = 0;


window.onload = async function init() {
    ctx = new AudioContext();

    // two canvas : one for drawing the waveform, the other for the trim bars
    canvas = document.querySelector("#myCanvas");
    const context = canvas.getContext('2d');
    canvasOverlay = document.querySelector("#myCanvasOverlay");

    // Fetch first 5 presets from API and populate select
    const presetSelect = document.querySelector('#presetSelect');
    const buttonsContainer = document.querySelector('#buttons');

    let presets = [];
    try {
        const resp = await fetch(`${API_BASE}/api/presets`);
        presets = await resp.json();
    } catch (e) {
        console.error('Erreur en récupérant les presets :', e);
        presets = [];
    }

    // keep only up to 5 names
    const firstFive = Array.isArray(presets) ? presets.slice(0, 5) : [];
    // populate select
    presetSelect.innerHTML = '<option value="">--Choisir un preset--</option>';
    firstFive.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = p.name || p.slug || `Preset ${i+1}`;
        presetSelect.appendChild(opt);
    });

    // when user selects a preset, load its samples and create buttons
    presetSelect.onchange = async function (e) {
        const idx = Number(this.value);
        if (Number.isNaN(idx) || !firstFive[idx]) {
            buttonsContainer.innerHTML = '';
            return;
        }
        const preset = firstFive[idx];
        await loadPresetSamplesAndCreateButtons(preset, buttonsContainer, canvas, canvasOverlay, ctx);
    };
    // activeSoundIndex is declared at module scope; default already 0
    console.log(sounds[0])

    // declare mouse event listeners for ajusting the trim bars
    // when the mouse moves, we check if we are close to a trim bar
    // if so: highlight it!
    // if a trim bar is selected and the mouse moves, we move the trim bar
    // when the mouse is pressed, we start dragging the selected trim bar (if any)
    // when the mouse is released, we stop dragging the trim bar (if any)
    canvasOverlay.onmousemove = (evt) => {
        // get the mouse position in the canvas
        let rect = canvas.getBoundingClientRect();

        mousePos.x = (evt.clientX - rect.left);
        mousePos.y = (evt.clientY - rect.top);

        // When the mouse moves, we check if we are close to a trim bar
        // if so: move it!
        // operate on the active sound's trimbars if available
        if (sounds[activeSoundIndex] && sounds[activeSoundIndex].trimBars)
            sounds[activeSoundIndex].trimBars.moveTrimBars(mousePos);
    }

    canvasOverlay.onmousedown = (evt) => {
        // If a trim bar is close to the mouse position, we start dragging it
        if (sounds[activeSoundIndex] && sounds[activeSoundIndex].trimBars)
            sounds[activeSoundIndex].trimBars.startDrag();
    }

    canvasOverlay.onmouseup = (evt) => {
        // We stop dragging the trim bars (if they were being dragged)
        if (sounds[activeSoundIndex] && sounds[activeSoundIndex].trimBars)
            sounds[activeSoundIndex].trimBars.stopDrag();
    }

    // start the animation loop for drawing the trim bars
    requestAnimationFrame(animate);
};

// Animation loop for drawing the trim bars
// We use requestAnimationFrame() to call the animate function
// at a rate of 60 frames per second (if possible)
// see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
function animate() {
    // clear overlay canvas;
    // clear overlay and draw the active sound's trim bars
    if (sounds[activeSoundIndex] && sounds[activeSoundIndex].trimBars) {
        sounds[activeSoundIndex].trimBars.clear();
        sounds[activeSoundIndex].trimBars.draw();
    }

    // redraw in 1/60th of a second
    requestAnimationFrame(animate);
}


// Load and decode all samples of a preset, create Sound objects and buttons
async function loadPresetSamplesAndCreateButtons(preset, container, canvas, canvasOverlay, ctx) {
    // clear previous
    sounds = [];
    activeSoundIndex = 0;
    container.innerHTML = '';

    const samples = Array.isArray(preset?.samples) ? preset.samples : [];
    if (samples.length === 0) {
        const msg = document.createElement('div');
        msg.textContent = 'Aucun sample dans ce preset.';
        container.appendChild(msg);
        return;
    }

    // decode all samples in parallel
    const decodePromises = samples.map(async (s) => {
        const url = resolveSampleUrl(s.url || s);
        if (!url) return { err: 'no-url', url: null, name: s.name || null };
        try {
            const buffer = await loadAndDecodeSound(url, ctx);
            return { buffer, url, name: s.name };
        } catch (e) {
            return { err: e, url, name: s.name };
        }
    });

    const results = await Promise.all(decodePromises);
    //todo add /preset to the url like this :http://localhost:3000/presets/808/Snare%20808%201.wav
    // create UI buttons for each successfully decoded sample
    results.forEach((r, index) => {
        if (r.buffer) {
            const wf = new WaveformDrawer();
            const tb = new TrimbarsDrawer(canvasOverlay, 100, 200);
            const sound = new Sound(wf, tb, r.buffer, canvas);
            sound.init('#83E83E');
            sounds.push(sound);
            const currentIndex = sounds.length - 1;

            const button = document.createElement('button');
            button.className = 'playButton';
            const label = r.name || (r.url ? r.url.split('/').pop() : `Sample ${index+1}`);
            button.textContent = `▶ ${label}`;
            container.appendChild(button);
            button.onclick = () => {
                activeSoundIndex = currentIndex;
                // play the active sound
                sounds[activeSoundIndex].play(ctx);
                // redraw waveform for the selected sound
                const context = canvas.getContext('2d');
                context.clearRect(0, 0, canvas.width, canvas.height);
                sounds[activeSoundIndex].waveForm.drawWave(0, canvas.height);
            };
        } else {
            // show error badge for this sample
            const errBtn = document.createElement('button');
            errBtn.disabled = true;
            const label = r.name || (r.url ? r.url.split('/').pop() : `Sample ${index+1}`);
            errBtn.textContent = `✖ ${label}`;
            container.appendChild(errBtn);
        }
    });
}



