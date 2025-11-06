// SamplerGUI: constructs Sound objects (waveform + trim bars + decoded buffers),
// updates buttons and wires UI events. It expects to receive decoded results from
// the engine and a reference to the shared `sounds` array used by the rest of the app.

export default class SamplerGUI {
    constructor({ canvas, canvasOverlay, buttonsContainer, WaveformDrawer, TrimbarsDrawer, Sound, sounds, ctx }) {
        this.canvas = canvas;
        this.canvasOverlay = canvasOverlay;
        this.buttonsContainer = buttonsContainer;
        this.WaveformDrawer = WaveformDrawer;
        this.TrimbarsDrawer = TrimbarsDrawer;
        this.SoundClass = Sound;
        // shared array from main.js where animation and keyboard handlers read sounds
        this.sounds = sounds;
        this.ctx = ctx;
    }

    // Prepare UI for loading: create/ensure progress bars for each pad/button
    prepareForLoading() {
        // We'll (re)create the 16 pad elements here so progress bars are always present
        // Clear existing content and build wrappers in the visual DOM order used elsewhere
        this.buttonsContainer.innerHTML = '';

        // Build DOM order matching visual layout (top->bottom rows)
        const domOrder = [];
        for (let row = 3; row >= 0; row--) {
            for (let col = 0; col < 4; col++) domOrder.push(row * 4 + col);
        }

        // Ensure shared sounds array is cleared
        this.sounds.length = 0;
        for (let i = 0; i < 16; i++) this.sounds.push(null);

        domOrder.forEach((slotIndex) => {
            // wrapper contains the button and the progress bar below it
            const wrap = document.createElement('div');
            wrap.className = 'padWrapper';

            const button = document.createElement('button');
            button.className = 'padButton';
            button.setAttribute('data-slot', String(slotIndex));
            button.disabled = true;
            button.textContent = '';

            const bar = document.createElement('div');
            bar.className = 'pad-progress';

            const fill = document.createElement('div');
            fill.className = 'pad-progress-fill';

            bar.appendChild(fill);
            wrap.appendChild(button);
            wrap.appendChild(bar);
            this.buttonsContainer.appendChild(wrap);
        });
    }

    // Update visual progress for a given sample slot (0..100). -1 indicates error.
    updateProgress(slotIndex, percent) {
        // Find button corresponding to slotIndex
        const button = this.buttonsContainer.querySelector(`.padButton[data-slot='${slotIndex}']`);
        if (!button) return;
        const bar = button.querySelector('.pad-progress');
        if (!bar) return;
        const fill = bar.querySelector('.pad-progress-fill');
        console.log(fill)
        if (!fill) return;
        if (percent < 0) {
            // error state
            fill.style.width = '100%';
            fill.style.background = '#e53935';
            button.textContent = 'Error';
            // reappend bar after text change
            button.appendChild(bar);
            button.disabled = true;
            return;
        }
        const p = Math.max(0, Math.min(100, percent));
        fill.style.width = String(p) + '%';
        // if complete, leave label to be replaced by buildFromDecoded
        if (p >= 100) {
            // optional: mark as ready
            button.textContent = '';
            button.appendChild(bar);
        }
    }

    buildFromDecoded(results, preset) {
        // reset
        const maxSlots = 16;
        const slotSounds = new Array(maxSlots).fill(null);
        const slotNames = new Array(maxSlots).fill(null);

        results.forEach((r, index) => {
            if (index >= maxSlots) return; // ignore extra samples
            if (r && r.buffer) {
                const wf = new this.WaveformDrawer();
                const tb = new this.TrimbarsDrawer(this.canvasOverlay, 0, this.canvas.width);
                const sound = new this.SoundClass(wf, tb, r.buffer, this.canvas);
                sound.init('#83E83E');
                slotSounds[index] = sound;
                slotNames[index] = r.name || (r.url ? r.url.split('/').pop() : `Sample ${index+1}`);
            } else {
                slotSounds[index] = null;
                slotNames[index] = null;
            }
        });

        // replace shared sounds array in-place so references remain valid
        this.sounds.length = 0;
        for (let i = 0; i < maxSlots; i++) this.sounds.push(slotSounds[i]);

        // Update buttons by data-slot so it works with dynamic creation
        for (let slotIndex = 0; slotIndex < slotSounds.length; slotIndex++) {
            const button = this.buttonsContainer.querySelector(`.padButton[data-slot='${slotIndex}']`);
            const slot = slotSounds[slotIndex];
            if (!button) continue;
            // remove previous handler
            button.onclick = null;
            // progress bar appearance - preserve final state (keep filled if already 100%)
            const bar = button.parentElement.querySelector('.pad-progress');
            const fill = bar ? bar.querySelector('.pad-progress-fill') : null;

            if (slot) {
                const label = slotNames[slotIndex] || `Sample ${slotIndex+1}`;
                button.disabled = false;
                // clear text and set label with play icon
                button.textContent = `▶ ${label}`;
                // reattach progress bar after text reset
                if (bar) {
                    // ensure the bar shows full for successfully decoded sounds
                    if (fill) fill.style.width = '100%';
                    button.parentElement.appendChild(bar);
                }
                button.onclick = () => {
                    // update active index used by other handlers
                    window.activeSoundIndex = slotIndex;
                    if (this.sounds[window.activeSoundIndex]) this.sounds[window.activeSoundIndex].play(this.ctx);
                    const context = this.canvas.getContext('2d');
                    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    if (this.sounds[window.activeSoundIndex]) this.sounds[window.activeSoundIndex].waveForm.drawWave(0, this.canvas.height);
                };
            } else {
                button.disabled = true;
                button.textContent = '';
            }
        }

        // If there is at least one sound, draw its waveform immediately
        if (this.sounds[0]) {
            const context = this.canvas.getContext('2d');
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.sounds[0].waveForm.drawWave(0, this.canvas.height);
        }
    }
}
