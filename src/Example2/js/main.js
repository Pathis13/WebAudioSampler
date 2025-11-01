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

// Keyboard mapping: key -> slot index
const KEY_TO_SLOT = {
    // top row (visual): 12,13,14,15 mapped to keys 1..4
    '&': 12, 'é': 13, '"': 14, "'": 15,
    // second row: a,z,e,r -> 8..11
    'a': 8, 'z': 9, 'e': 10, 'r': 11,
    // third row: q,s,d,f -> 4..7
    'q': 4, 's': 5, 'd': 6, 'f': 7,
    // bottom row: w,x,c,v -> 0..3
    'w': 0, 'x': 1, 'c': 2, 'v': 3
};

// Trigger pad action programmatically for a slot (play + redraw + flash button)
function triggerPad(slot) {
    if (typeof slot !== 'number' || slot < 0 || slot > 15) return;
    if (!sounds[slot]) return; // no sound assigned

    activeSoundIndex = slot;
    try { sounds[activeSoundIndex].play(ctx); } catch (e) { /* ignore */ }

    // redraw waveform for the selected sound
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (sounds[activeSoundIndex]) sounds[activeSoundIndex].waveForm.drawWave(0, canvas.height);

    // flash the corresponding button
    const btn = document.querySelector(`#buttons .padButton[data-slot='${slot}']`);
    if (btn) {
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 120);
    }
}

window.onload = async function init() {
    ctx = new AudioContext();

    // two canvas : one for drawing the waveform, the other for the trim bars
    canvas = document.querySelector("#myCanvas");
    const context = canvas.getContext('2d');
    canvasOverlay = document.querySelector("#myCanvasOverlay");

    // Fetch first 5 presets from API and populate select
    const presetSelect = document.querySelector('#presetSelect');
    const buttonsContainer = document.querySelector('#buttons');

    // initialize sounds array with 16 null slots so trimbars handlers won't error
    sounds = new Array(16).fill(null);

    let presets = [];
    try {
        const resp = await fetch(`${API_BASE}/api/presets`);
        presets = await resp.json();
    } catch (e) {
        console.error('Erreur en récupérant les presets :', e);
        presets = [];
    }

    // populate select
    presetSelect.innerHTML = '<option value="">--Choisir un preset--</option>';
    presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = p.name || p.slug || `Preset ${i+1}`;
        presetSelect.appendChild(opt);
    });

    // when user selects a preset, load its samples and update existing buttons
    presetSelect.onchange = async function (e) {
        const idx = Number(this.value);
        if (Number.isNaN(idx) || !presets[idx]) {
            // disable and clear all pre-created buttons
            const padButtons = buttonsContainer.querySelectorAll('.padButton');
            padButtons.forEach(b => { b.disabled = true; b.textContent = ''; b.onclick = null; });
            return;
        }
        const preset = presets[idx];
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

    // keyboard handling: map keys to pad slots
    window.addEventListener('keydown', (e) => {
        // ignore typing into inputs/textareas or contenteditable elements
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

        const key = (e.key || '').toLowerCase();
        const slot = KEY_TO_SLOT[key];
        if (typeof slot === 'number') {
            e.preventDefault();
            triggerPad(slot);
        }
    });
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
    // prepare previous state
    sounds = new Array(16).fill(null);
    activeSoundIndex = 0;

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
    // Reset sounds to a fixed-size array of 16 slots and keep names for labels
    const maxSlots = 16;
    const slotSounds = new Array(maxSlots).fill(null);
    const slotNames = new Array(maxSlots).fill(null);

    // Fill slotSounds with decoded sounds (keep only the first 16 samples)
    results.forEach((r, index) => {
        if (index >= maxSlots) return; // ignore extra samples
        if (r.buffer) {
            const wf = new WaveformDrawer();
            const tb = new TrimbarsDrawer(canvasOverlay, 0, canvas.width);
            const sound = new Sound(wf, tb, r.buffer, canvas);
            sound.init('#83E83E');
            slotSounds[index] = sound; // store Sound instance so trimBars remain available
            slotNames[index] = r.name || (r.url ? r.url.split('/').pop() : `Sample ${index+1}`);
        } else {
            slotSounds[index] = null;
            slotNames[index] = null;
        }
    });

    // Replace global sounds with slotSounds (so other code can access by index)
    sounds = slotSounds;

    // Build DOM order: rows from top to bottom, each row left-to-right, but slots are
    // numbered bottom-to-top. That same order is used in the HTML so the NodeList
    // order of `.padButton` matches the visual ordering.
    const domOrder = [];
    for (let row = 3; row >= 0; row--) {
        for (let col = 0; col < 4; col++) {
            domOrder.push(row * 4 + col);
        }
    }

    // Update existing pre-created buttons instead of recreating them
    const padButtons = container.querySelectorAll('.padButton');
    padButtons.forEach((button, i) => {
        const slotIndex = domOrder[i];
        const slot = slotSounds[slotIndex];
        // remove previous handler
        button.onclick = null;
        if (slot) {
            const label = slotNames[slotIndex] || `Sample ${slotIndex+1}`;
            button.disabled = false;
            button.textContent = `▶ ${label}`;
            button.onclick = () => {
                activeSoundIndex = slotIndex;
                if (sounds[activeSoundIndex]) sounds[activeSoundIndex].play(ctx);
                const context = canvas.getContext('2d');
                context.clearRect(0, 0, canvas.width, canvas.height);
                if (sounds[activeSoundIndex]) sounds[activeSoundIndex].waveForm.drawWave(0, canvas.height);
            };
        } else {
            button.disabled = true;
            button.textContent = '';
        }
    });
}



