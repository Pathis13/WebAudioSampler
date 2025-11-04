import { playSound } from './soundutils.js';

// SamplerEngine: responsible only for loading/decoding audio buffers in parallel
// and providing simple playback helpers. It does NOT handle UI or drawing.
export default class SamplerEngine {
    constructor(ctx, resolveUrlFn) {
        this.ctx = ctx;
        this.resolveUrl = resolveUrlFn || (u => u);
        // results: array of { buffer?, url?, name?, err? }
        this.results = [];
    }

    // Load and decode all samples of a preset in parallel.
    // Returns an array of result objects: { buffer, url, name } or { err, url, name }
    async loadPresetSamples(preset) {
        const samples = Array.isArray(preset?.samples) ? preset.samples : [];
        if (samples.length === 0) {
            this.results = [];
            return this.results;
        }

        const decodePromises = samples.map(async (s) => {
            const url = this.resolveUrl(s.url || s);
            if (!url) return { err: 'no-url', url: null, name: s.name || null };
            try {
                const resp = await fetch(url);
                const arrayBuffer = await resp.arrayBuffer();
                const decoded = await this.ctx.decodeAudioData(arrayBuffer);
                return { buffer: decoded, url, name: s.name };
            } catch (e) {
                return { err: e, url, name: s.name };
            }
        });

        this.results = await Promise.all(decodePromises);
        return this.results;
    }

    // Play a decoded buffer by its index in the results array. Optionally provide
    // start and end times (in seconds). Returns the created BufferSource node or null.
    playByIndex(index, start = 0, end = null) {
        const r = this.results[index];
        if (!r || !r.buffer) return null;
        const buffer = r.buffer;
        if (start < 0) start = 0;
        if (end === null || end > buffer.duration) end = buffer.duration;

        // Use the helper from soundutils to keep behavior consistent with Sound.play
        playSound(this.ctx, buffer, start, end);
        return true;
    }

    // Provide raw access to results
    getDecodedResults() {
        return this.results;
    }
}
