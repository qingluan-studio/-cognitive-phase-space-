import { DataPacket } from '../shared/types';
import { Audio } from './AudioProcessing';

export interface SoundSource {
  position: [number, number];
  intensity: number;
}

export interface AudioEvent {
  type: string;
  startTime: number;
  duration: number;
  confidence: number;
}

export class AudioEventDetection {
  private _events: AudioEvent[] = [];
  private _sources: SoundSource[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _lastEvent: AudioEvent | null = null;

  get events(): AudioEvent[] {
    return this._events;
  }

  get sources(): SoundSource[] {
    return this._sources;
  }

  get modelType(): string {
    return this._modelType;
  }

  detectEvents(audio: Audio, model: { name: string }): AudioEvent[] {
    const events: AudioEvent[] = [];
    const frameSize = Math.floor(audio.sampleRate * 0.025);
    const hopSize = Math.floor(audio.sampleRate * 0.01);
    let inEvent = false;
    let eventStart = 0;
    let eventEnergy = 0;
    let threshold = 0.1;
    for (let i = 0; i < audio.samples.length; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < frameSize && i + j < audio.samples.length; j++) {
        energy += audio.samples[i + j] * audio.samples[i + j];
      }
      energy = Math.sqrt(energy / frameSize);
      const time = i / audio.sampleRate;
      if (energy > threshold && !inEvent) {
        inEvent = true;
        eventStart = time;
        eventEnergy = energy;
      } else if (energy > threshold && inEvent) {
        eventEnergy = Math.max(eventEnergy, energy);
      } else if (energy <= threshold && inEvent) {
        inEvent = false;
        const duration = time - eventStart;
        if (duration > 0.05) {
          const eventTypes = ['speech', 'noise', 'music', 'impact', 'ambient'];
          const typeIdx = Math.floor(eventEnergy * 100) % eventTypes.length;
          events.push({
            type: eventTypes[typeIdx],
            startTime: eventStart,
            duration,
            confidence: Math.min(1, eventEnergy * 2)
          });
        }
      }
    }
    this._events = events;
    this._modelType = model.name;
    if (events.length > 0) {
      this._lastEvent = events[0];
    }
    return events;
  }

  classifyAudio(audio: Audio, model: { name: string }): string {
    const events = this.detectEvents(audio, model);
    return events.length > 0 ? events[0].type : 'silence';
  }

  environmentalSound(audio: Audio): string {
    const rms = this._rms(audio.samples);
    const zcr = this._zcr(audio.samples);
    if (rms < 0.01) return 'silence';
    if (zcr > 0.3) return 'noise';
    if (rms > 0.2) return 'loud';
    return 'ambient';
  }

  gunshotDetect(audio: Audio): boolean {
    const frameSize = Math.floor(audio.sampleRate * 0.01);
    for (let i = 0; i < audio.samples.length - frameSize; i += frameSize) {
      let peak = 0;
      for (let j = 0; j < frameSize; j++) {
        peak = Math.max(peak, Math.abs(audio.samples[i + j]));
      }
      if (peak > 0.8) {
        let decayCount = 0;
        for (let j = 0; j < frameSize * 3 && i + j < audio.samples.length; j++) {
          if (Math.abs(audio.samples[i + j]) < peak * 0.1) {
            decayCount++;
          }
        }
        if (decayCount > frameSize * 2) {
          return true;
        }
      }
    }
    return false;
  }

  glassBreakDetect(audio: Audio): boolean {
    const zcr = this._zcr(audio.samples);
    const rms = this._rms(audio.samples);
    return zcr > 0.4 && rms > 0.1;
  }

  screamDetect(audio: Audio): boolean {
    const highFreqEnergy = this._highFreqRatio(audio);
    const rms = this._rms(audio.samples);
    return highFreqEnergy > 0.5 && rms > 0.15;
  }

  babyCryDetect(audio: Audio): boolean {
    let fundamentalFreq = 0;
    let maxCorr = 0;
    const minLag = Math.floor(audio.sampleRate / 2000);
    const maxLag = Math.floor(audio.sampleRate / 300);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < audio.samples.length - lag; i++) {
        corr += audio.samples[i] * audio.samples[i + lag];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        fundamentalFreq = audio.sampleRate / lag;
      }
    }
    return fundamentalFreq > 300 && fundamentalFreq < 2000;
  }

  keywordSpotting(audio: Audio, keywords: string[]): { keyword: string; startTime: number; confidence: number }[] {
    const results: { keyword: string; startTime: number; confidence: number }[] = [];
    const keywordDuration = 0.5;
    const hop = 0.25;
    for (let t = 0; t < audio.duration - keywordDuration; t += hop) {
      for (const keyword of keywords) {
        const seed = this._hash(keyword + Math.floor(t * 10));
        const confidence = 0.5 + (seed % 50) / 100;
        if (confidence > 0.7) {
          results.push({ keyword, startTime: t, confidence });
        }
      }
    }
    return results;
  }

  onsetDetection(audio: Audio): number[] {
    const onsets: number[] = [];
    const frameSize = Math.floor(audio.sampleRate * 0.025);
    const hopSize = Math.floor(audio.sampleRate * 0.01);
    let prevEnergy = 0;
    for (let i = 0; i < audio.samples.length; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < frameSize && i + j < audio.samples.length; j++) {
        energy += audio.samples[i + j] * audio.samples[i + j];
      }
      if (prevEnergy > 0 && energy > prevEnergy * 1.5) {
        onsets.push(i / audio.sampleRate);
      }
      prevEnergy = energy;
    }
    return onsets;
  }

  beatDetection(audio: Audio): number {
    const onsets = this.onsetDetection(audio);
    if (onsets.length < 2) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    if (intervals.length === 0) return 0;
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return avgInterval > 0 ? 60 / avgInterval : 0;
  }

  sourceSeparation(audio: Audio, sources: number): Audio[] {
    const results: Audio[] = [];
    for (let s = 0; s < sources; s++) {
      const samples: number[] = [];
      for (let i = 0; i < audio.samples.length; i++) {
        const phase = (i / audio.sampleRate) * (200 + s * 100);
        samples.push(audio.samples[i] * 0.5 * (1 + Math.sin(phase + s)));
      }
      results.push({
        samples,
        sampleRate: audio.sampleRate,
        channels: 1,
        duration: audio.duration
      });
    }
    return results;
  }

  beamforming(micSignals: number[][], direction: number): number[] {
    const numMics = micSignals.length;
    const numSamples = micSignals[0]?.length || 0;
    const result: number[] = [];
    const delays: number[] = [];
    for (let m = 0; m < numMics; m++) {
      delays.push(Math.floor(m * 5 * Math.cos(direction)));
    }
    for (let i = 0; i < numSamples; i++) {
      let sum = 0;
      for (let m = 0; m < numMics; m++) {
        const idx = Math.max(0, Math.min(numSamples - 1, i + delays[m]));
        sum += micSignals[m][idx];
      }
      result.push(sum / numMics);
    }
    return result;
  }

  private _rms(samples: number[]): number {
    let sum = 0;
    for (const s of samples) {
      sum += s * s;
    }
    return Math.sqrt(sum / samples.length);
  }

  private _zcr(samples: number[]): number {
    let count = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) ||
          (samples[i] < 0 && samples[i - 1] >= 0)) {
        count++;
      }
    }
    return count / samples.length;
  }

  private _highFreqRatio(audio: Audio): number {
    const n = audio.samples.length;
    let total = 0;
    let high = 0;
    for (let i = 0; i < n; i++) {
      total += audio.samples[i] * audio.samples[i];
      if (i > n / 2) {
        high += audio.samples[i] * audio.samples[i];
      }
    }
    return total > 0 ? high / total : 0;
  }

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  toPacket(): DataPacket<AudioEvent[]> {
    this._counter++;
    return {
      id: `audio-event-${Date.now()}-${this._counter}`,
      payload: this._events,
      metadata: {
        createdAt: Date.now(),
        route: ['speech', 'audio-event-detection'],
        priority: 1,
        phase: 'event-detection'
      }
    };
  }

  reset(): void {
    this._events = [];
    this._sources = [];
    this._counter = 0;
    this._modelType = 'default';
    this._lastEvent = null;
  }
}
