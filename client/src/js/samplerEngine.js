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
    // onProgress is an optional callback (index, percent)
    async loadPresetSamples(preset, onProgress) {
        const samples = Array.isArray(preset?.samples) ? preset.samples : [];
        if (samples.length === 0) {
            this.results = [];
            return this.results;
        }
        const decodePromises = samples.map((s, idx) => this._loadAndDecodeSample(s, idx, onProgress));

        this.results = await Promise.all(decodePromises);
        return this.results;
    }

    async _loadAndDecodeSample(s, index, onProgress) {
        const url = this.resolveUrl(s.url || s);
        const name = s.name || null;
        if (!url) {
            if (typeof onProgress === 'function') onProgress(index, -1);
            return { err: 'no-url', url: null, name };
        }
        try {
            const resp = await fetch(url);

            // If the response supports streaming, read chunks and report download progress
            if (resp.body && resp.headers) {
                const contentLengthHeader = resp.headers.get('content-length');
                const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
                const reader = resp.body.getReader();
                let received = 0;
                const chunks = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    received += value.length;
                    // Report download progress scaled to 0..70 (download portion)
                    if (typeof onProgress === 'function') {
                        const pct = total ? Math.round((received / total) * 70) : Math.min(70, Math.round((received / (received + 100000)) * 70));
                        onProgress(index, pct);
                    }
                }
                // concat chunks
                const buffer = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
                let offset = 0;
                for (const chunk of chunks) {
                    buffer.set(chunk, offset);
                    offset += chunk.length;
                }
                const arrayBuffer = buffer.buffer;
                // Decoding started
                if (typeof onProgress === 'function') onProgress(index, 80);
                const decoded = await this.ctx.decodeAudioData(arrayBuffer);
                if (typeof onProgress === 'function') onProgress(index, 100);
                return { buffer: decoded, url, name };
            }

            // Fallback: read entire arrayBuffer (no streaming)
            if (typeof onProgress === 'function') onProgress(index, 30);
            const arrayBuffer = await resp.arrayBuffer();
            if (typeof onProgress === 'function') onProgress(index, 80);
            const decoded = await this.ctx.decodeAudioData(arrayBuffer);
            if (typeof onProgress === 'function') onProgress(index, 100);
            return { buffer: decoded, url, name };
        } catch (e) {
            if (typeof onProgress === 'function') onProgress(index, -1);
            return { err: e, url, name };
        }
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
