import { pixelToSeconds } from './utils.js';
import { playSound } from './soundutils.js';

// A Sound groups a WaveformDrawer, a TrimbarsDrawer and the decoded audio buffer
export default class Sound {
    waveForm
    trimBars
    buffer
    canvas

    constructor(waveForm, trimBars, decodedBuffer, canvas) {
        this.waveForm = waveForm;
        this.trimBars = trimBars;
        this.buffer = decodedBuffer;
        this.canvas = canvas;
    }

    // initialize drawing (build peaks etc.)
    init(color) {
        if (!this.waveForm || !this.trimBars || !this.buffer || !this.canvas) return;
        this.waveForm.init(this.buffer, this.canvas, color);
    }

    // return start and end times in seconds according to the current trim bars
    getTrimTimes() {
        if (!this.trimBars || !this.buffer || !this.canvas) return { start: 0, end: this.buffer ? this.buffer.duration : 0 };
        const start = pixelToSeconds(this.trimBars.leftTrimBar.x, this.buffer.duration, this.canvas.width);
        const end = pixelToSeconds(this.trimBars.rightTrimBar.x, this.buffer.duration, this.canvas.width);
        return { start, end };
    }

    // play this sound using an AudioContext
    play(ctx) {
        if (!this.buffer) return;
        const { start, end } = this.getTrimTimes();
        playSound(ctx, this.buffer, start, end);
    }
}