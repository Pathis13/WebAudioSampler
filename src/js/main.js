// About imports and exports in JavaScript modules
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export

// default imports of classes from waveformdrawer.js and trimbarsdrawer.js
import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import Sound from './sound.js';
import SamplerEngine from './samplerEngine.js';
import SamplerGUI from './samplerGUI.js';

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
// expose on window so GUI callbacks can update it as well
window.activeSoundIndex = 0;

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

    window.activeSoundIndex = slot;
    try { sounds[window.activeSoundIndex].play(ctx); } catch (e) { /* ignore */ }

    // redraw waveform for the selected sound
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (sounds[window.activeSoundIndex]) sounds[window.activeSoundIndex].waveForm.drawWave(0, canvas.height);

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

    // instantiate engine and GUI
    const engine = new SamplerEngine(ctx, resolveSampleUrl);
    const gui = new SamplerGUI({
        canvas,
        canvasOverlay,
        buttonsContainer,
        WaveformDrawer,
        TrimbarsDrawer,
        Sound,
        sounds,
        ctx
    });

    // create buttons + progress bars immediately so they are always visible
    gui.prepareForLoading();

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

    // when user selects a preset, ask the engine to decode (in parallel)
    // then let the GUI build visuals and wire buttons
    presetSelect.onchange = async function (e) {
        const idx = Number(this.value);
        if (Number.isNaN(idx) || !presets[idx]) {
            // disable and clear all pre-created buttons
            const padButtons = buttonsContainer.querySelectorAll('.padButton');
            padButtons.forEach(b => { b.disabled = true; b.textContent = ''; b.onclick = null; });
            return;
        }
        const preset = presets[idx];
        // prepare GUI for loading so progress bars exist
        gui.prepareForLoading(preset);
        // engine loads & decodes samples in parallel and reports progress to GUI
        const decodedResults = await engine.loadPresetSamples(preset, (index, pct) => {
            try { gui.updateProgress(index, pct); } catch (e) { /* ignore UI errors */ }
        });
        // GUI builds Sound instances, updates `sounds` array and buttons
        gui.buildFromDecoded(decodedResults, preset);
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
        if (sounds[window.activeSoundIndex] && sounds[window.activeSoundIndex].trimBars)
            sounds[window.activeSoundIndex].trimBars.moveTrimBars(mousePos);
    }

    canvasOverlay.onmousedown = (evt) => {
        // If a trim bar is close to the mouse position, we start dragging it
        if (sounds[window.activeSoundIndex] && sounds[window.activeSoundIndex].trimBars)
            sounds[window.activeSoundIndex].trimBars.startDrag();
    }

    canvasOverlay.onmouseup = (evt) => {
        // We stop dragging the trim bars (if they were being dragged)
        if (sounds[window.activeSoundIndex] && sounds[window.activeSoundIndex].trimBars)
            sounds[window.activeSoundIndex].trimBars.stopDrag();
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
    if (sounds[window.activeSoundIndex] && sounds[window.activeSoundIndex].trimBars) {
        sounds[window.activeSoundIndex].trimBars.clear();
        sounds[window.activeSoundIndex].trimBars.draw();
    }

    // redraw in 1/60th of a second
    requestAnimationFrame(animate);
}


// Load and decode all samples of a preset, create Sound objects and buttons




