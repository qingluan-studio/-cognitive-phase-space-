import { DataPacket } from '../shared/types';

export interface Audio {
  samples: number[];
  sampleRate: number;
  channels: number;
  duration: number;
}

export interface FrequencyDomain {
  spectrum: number[];
  freqs: number[];
}

export class AudioProcessing {
  private _audios: Audio[] = [];
  private _lastAudio: Audio | null = null;
  private _counter: number = 0;
  private _sampleRate: number = 44100;

  get audios(): Audio[] {
    return this._audios;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  loadAudio(samples: number[], sampleRate: number): Audio {
    const audio: Audio = {
      samples: [...samples],
      sampleRate,
      channels: 1,
      duration: samples.length / sampleRate
    };
    this._lastAudio = audio;
    this._audios.push(audio);
    this._sampleRate = sampleRate;
    return audio;
  }

  resample(audio: Audio, targetRate: number): Audio {
    const ratio = targetRate / audio.sampleRate;
    const newLength = Math.floor(audio.samples.length * ratio);
    const result: number[] = [];
    for (let i = 0; i < newLength; i++) {
      const srcIdx = i / ratio;
      const idx0 = Math.floor(srcIdx);
      const idx1 = Math.min(idx0 + 1, audio.samples.length - 1);
      const frac = srcIdx - idx0;
      result.push(audio.samples[idx0] * (1 - frac) + audio.samples[idx1] * frac);
    }
    const resampled: Audio = {
      samples: result,
      sampleRate: targetRate,
      channels: audio.channels,
      duration: result.length / targetRate
    };
    this._lastAudio = resampled;
    return resampled;
  }

  stereoToMono(audio: Audio): Audio {
    if (audio.channels === 1) return audio;
    const samplesPerChannel = Math.floor(audio.samples.length / audio.channels);
    const mono: number[] = [];
    for (let i = 0; i < samplesPerChannel; i++) {
      let sum = 0;
      for (let ch = 0; ch < audio.channels; ch++) {
        sum += audio.samples[i * audio.channels + ch];
      }
      mono.push(sum / audio.channels);
    }
    const result: Audio = {
      samples: mono,
      sampleRate: audio.sampleRate,
      channels: 1,
      duration: mono.length / audio.sampleRate
    };
    this._lastAudio = result;
    return result;
  }

  normalize(audio: Audio, target: number = 1.0): Audio {
    let max = 0;
    for (const s of audio.samples) {
      const abs = Math.abs(s);
      if (abs > max) max = abs;
    }
    if (max === 0) return audio;
    const gain = target / max;
    const normalized = audio.samples.map(s => s * gain);
    const result: Audio = {
      ...audio,
      samples: normalized
    };
    this._lastAudio = result;
    return result;
  }

  trimSilence(audio: Audio, threshold: number = 0.01): Audio {
    let start = 0;
    let end = audio.samples.length - 1;
    const windowSize = Math.floor(audio.sampleRate * 0.01);
    for (let i = 0; i < audio.samples.length - windowSize; i += windowSize) {
      let rms = 0;
      for (let j = 0; j < windowSize; j++) {
        rms += audio.samples[i + j] * audio.samples[i + j];
      }
      rms = Math.sqrt(rms / windowSize);
      if (rms > threshold) {
        start = i;
        break;
      }
    }
    for (let i = audio.samples.length - windowSize; i > 0; i -= windowSize) {
      let rms = 0;
      for (let j = 0; j < windowSize; j++) {
        rms += audio.samples[i + j] * audio.samples[i + j];
      }
      rms = Math.sqrt(rms / windowSize);
      if (rms > threshold) {
        end = i + windowSize;
        break;
      }
    }
    const trimmed = audio.samples.slice(start, end + 1);
    const result: Audio = {
      samples: trimmed,
      sampleRate: audio.sampleRate,
      channels: audio.channels,
      duration: trimmed.length / audio.sampleRate
    };
    this._lastAudio = result;
    return result;
  }

  preEmphasis(audio: Audio, alpha: number = 0.97): Audio {
    const result: number[] = [audio.samples[0]];
    for (let i = 1; i < audio.samples.length; i++) {
      result.push(audio.samples[i] - alpha * audio.samples[i - 1]);
    }
    const emphasized: Audio = {
      ...audio,
      samples: result
    };
    this._lastAudio = emphasized;
    return emphasized;
  }

  hammingWindow(audio: Audio, frameSize: number): number[] {
    const window: number[] = [];
    for (let i = 0; i < frameSize; i++) {
      window.push(0.54 - 0.46 * Math.cos(2 * Math.PI * i / (frameSize - 1)));
    }
    return window;
  }

  framing(audio: Audio, frameSize: number, hopSize: number): number[][] {
    const frames: number[][] = [];
    const window = this.hammingWindow(audio, frameSize);
    for (let i = 0; i <= audio.samples.length - frameSize; i += hopSize) {
      const frame: number[] = [];
      for (let j = 0; j < frameSize; j++) {
        frame.push(audio.samples[i + j] * window[j]);
      }
      frames.push(frame);
    }
    return frames;
  }

  stft(audio: Audio, params: { frameSize?: number; hopSize?: number } = {}): FrequencyDomain[] {
    const frameSize = params.frameSize || 2048;
    const hopSize = params.hopSize || 512;
    const frames = this.framing(audio, frameSize, hopSize);
    const result: FrequencyDomain[] = [];
    for (const frame of frames) {
      const spectrum = this.fft(frame);
      const freqs: number[] = [];
      const half = Math.floor(spectrum.length / 2);
      for (let i = 0; i < half; i++) {
        freqs.push(i * audio.sampleRate / frameSize);
      }
      result.push({
        spectrum: spectrum.slice(0, half),
        freqs
      });
    }
    return result;
  }

  fft(samples: number[]): number[] {
    const n = samples.length;
    if (n <= 1) return [Math.abs(samples[0])];
    const even: number[] = [];
    const odd: number[] = [];
    for (let i = 0; i < n; i += 2) {
      even.push(samples[i]);
      odd.push(samples[i + 1] || 0);
    }
    const fftEven = this.fft(even);
    const fftOdd = this.fft(odd);
    const result: number[] = new Array(n);
    for (let k = 0; k < n / 2; k++) {
      const angle = -2 * Math.PI * k / n;
      const re = Math.cos(angle);
      const im = Math.sin(angle);
      const oddRe = fftOdd[k] * re;
      const oddIm = fftOdd[k] * im;
      result[k] = Math.sqrt((fftEven[k] + oddRe) ** 2 + oddIm ** 2);
      result[k + n / 2] = Math.sqrt((fftEven[k] - oddRe) ** 2 + (-oddIm) ** 2);
    }
    return result;
  }

  mfcc(audio: Audio, params: { numCoeffs?: number; frameSize?: number; hopSize?: number } = {}): number[][] {
    const numCoeffs = params.numCoeffs || 13;
    const frameSize = params.frameSize || 2048;
    const hopSize = params.hopSize || 512;
    const stftResult = this.stft(audio, { frameSize, hopSize });
    const mfccs: number[][] = [];
    const numFilters = 26;
    for (const freq of stftResult) {
      const filterBank = this._melFilterBank(freq.spectrum, freq.freqs, numFilters);
      const logFilter = filterBank.map(v => Math.log(Math.max(v, 1e-10)));
      const dct = this._dct(logFilter, numCoeffs);
      mfccs.push(dct);
    }
    return mfccs;
  }

  spectralCentroid(spectrum: number[]): number {
    let sum = 0;
    let weighted = 0;
    for (let i = 0; i < spectrum.length; i++) {
      sum += spectrum[i];
      weighted += i * spectrum[i];
    }
    return sum > 0 ? weighted / sum : 0;
  }

  spectralRolloff(spectrum: number[], percentile: number = 0.85): number {
    const total = spectrum.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const target = total * percentile;
    let cum = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cum += spectrum[i];
      if (cum >= target) return i;
    }
    return spectrum.length - 1;
  }

  zeroCrossingRate(samples: number[]): number {
    let count = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
        count++;
      }
    }
    return count / samples.length;
  }

  private _melFilterBank(spectrum: number[], freqs: number[], numFilters: number): number[] {
    const minMel = this._freqToMel(20);
    const maxMel = this._freqToMel(freqs[freqs.length - 1]);
    const melPoints: number[] = [];
    for (let i = 0; i <= numFilters + 1; i++) {
      const mel = minMel + (maxMel - minMel) * i / (numFilters + 1);
      melPoints.push(this._melToFreq(mel));
    }
    const filterBank = new Array(numFilters).fill(0);
    for (let f = 0; f < numFilters; f++) {
      const left = melPoints[f];
      const center = melPoints[f + 1];
      const right = melPoints[f + 2];
      for (let i = 0; i < freqs.length; i++) {
        const freq = freqs[i];
        if (freq >= left && freq <= center) {
          filterBank[f] += spectrum[i] * (freq - left) / (center - left + 1e-10);
        } else if (freq > center && freq <= right) {
          filterBank[f] += spectrum[i] * (right - freq) / (right - center + 1e-10);
        }
      }
    }
    return filterBank;
  }

  private _freqToMel(freq: number): number {
    return 2595 * Math.log10(1 + freq / 700);
  }

  private _melToFreq(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  private _dct(input: number[], numCoeffs: number): number[] {
    const n = input.length;
    const result: number[] = [];
    for (let k = 0; k < numCoeffs; k++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += input[i] * Math.cos(Math.PI * k * (2 * i + 1) / (2 * n));
      }
      result.push(sum);
    }
    return result;
  }

  toPacket(): DataPacket<Audio> {
    const result = this._lastAudio || { samples: [], sampleRate: 0, channels: 0, duration: 0 };
    this._counter++;
    return {
      id: `audio-proc-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech', 'audio-processing'],
        priority: 1,
        phase: 'audio-processing'
      }
    };
  }

  reset(): void {
    this._audios = [];
    this._lastAudio = null;
    this._counter = 0;
    this._sampleRate = 44100;
  }
}
