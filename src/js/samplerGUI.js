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

        // Build DOM order matching visual layout (top->bottom rows)
        const domOrder = [];
        for (let row = 3; row >= 0; row--) {
            for (let col = 0; col < 4; col++) {
                domOrder.push(row * 4 + col);
            }
        }

        // Update existing buttons
        const padButtons = this.buttonsContainer.querySelectorAll('.padButton');
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
        });

        // If there is at least one sound, draw its waveform immediately
        if (this.sounds[0]) {
            const context = this.canvas.getContext('2d');
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.sounds[0].waveForm.drawWave(0, this.canvas.height);
        }
    }
}
