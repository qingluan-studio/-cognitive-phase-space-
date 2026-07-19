import { DataPacket } from '../shared/types';

export interface AudioFrame {
  index: number;
  samples: number[];
  energy: number;
  zcr: number;
  timestamp: number;
}

export interface DenoiseResult {
  method: string;
  noiseProfile: number[];
  snrBefore: number;
  snrAfter: number;
}

export interface NormalizationResult {
  method: string;
  originalPeak: number;
  targetPeak: number;
  gain: number;
}

export interface PreprocessingResult {
  audioData: number[];
  sampleRate: number;
  duration: number;
  frames: AudioFrame[];
  frameCount: number;
  denoise: DenoiseResult;
  normalization: NormalizationResult;
  preEmphasisCoeff: number;
  windowType: string;
  frameSize: number;
  hopSize: number;
}

export class AudioPreprocessing {
  private _audioData: number[] = [];
  private _sampleRate: number = 16000;
  private _frameSize: number = 512;
  private _hopSize: number = 256;
  private _preEmphasisCoeff: number = 0.97;
  private _windowType: string = 'hamming';
  private _frames: AudioFrame[] = [];
  private _noiseProfile: number[] = [];
  private _denoiseMethod: string = 'spectral';
  private _normalizationMethod: string = 'peak';
  private _targetPeak: number = 0.9;
  private _counter: number = 0;
  private _lastResult: PreprocessingResult | null = null;
  private _snrBefore: number = 0;
  private _snrAfter: number = 0;
  private _originalPeak: number = 0;
  private _gain: number = 1;

  constructor() {
    this._initDefaultNoiseProfile();
  }

  private _initDefaultNoiseProfile(): void {
    this._noiseProfile = new Array(257).fill(0.01);
  }

  get audioData(): number[] {
    return this._audioData;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  get frameSize(): number {
    return this._frameSize;
  }

  get hopSize(): number {
    return this._hopSize;
  }

  get preEmphasisCoeff(): number {
    return this._preEmphasisCoeff;
  }

  get windowType(): string {
    return this._windowType;
  }

  get frames(): AudioFrame[] {
    return this._frames;
  }

  get frameCount(): number {
    return this._frames.length;
  }

  get noiseProfile(): number[] {
    return this._noiseProfile;
  }

  get denoiseMethod(): string {
    return this._denoiseMethod;
  }

  get normalizationMethod(): string {
    return this._normalizationMethod;
  }

  get duration(): number {
    return this._audioData.length / this._sampleRate;
  }

  setSampleRate(rate: number): void {
    if (rate <= 0) {
      throw new Error('Sample rate must be positive');
    }
    this._sampleRate = rate;
  }

  setFrameSize(size: number): void {
    if (size <= 0 || (size & (size - 1)) !== 0) {
      throw new Error('Frame size must be a positive power of two');
    }
    this._frameSize = size;
  }

  setHopSize(size: number): void {
    if (size <= 0) {
      throw new Error('Hop size must be positive');
    }
    this._hopSize = size;
  }

  setPreEmphasisCoeff(coeff: number): void {
    if (coeff < 0 || coeff >= 1) {
      throw new Error('Pre-emphasis coefficient must be in [0, 1)');
    }
    this._preEmphasisCoeff = coeff;
  }

  setWindowType(type: string): void {
    const validTypes = ['hamming', 'hanning', 'blackman', 'rectangular', 'gaussian'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid window type: ${type}`);
    }
    this._windowType = type;
  }

  setDenoiseMethod(method: string): void {
    const validMethods = ['spectral', 'wiener', 'spectral_subtraction', 'mmse', 'none'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid denoise method: ${method}`);
    }
    this._denoiseMethod = method;
  }

  setNormalizationMethod(method: string): void {
    const validMethods = ['peak', 'rms', 'loudness', 'none'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid normalization method: ${method}`);
    }
    this._normalizationMethod = method;
  }

  setTargetPeak(peak: number): void {
    if (peak <= 0 || peak > 1) {
      throw new Error('Target peak must be in (0, 1]');
    }
    this._targetPeak = peak;
  }

  preEmphasize(audio: number[]): number[] {
    if (audio.length === 0) {
      return [];
    }
    const result = new Array(audio.length);
    result[0] = audio[0];
    for (let i = 1; i < audio.length; i++) {
      result[i] = audio[i] - this._preEmphasisCoeff * audio[i - 1];
    }
    return result;
  }

  deEmphasize(audio: number[]): number[] {
    if (audio.length === 0) {
      return [];
    }
    const result = new Array(audio.length);
    result[0] = audio[0];
    for (let i = 1; i < audio.length; i++) {
      result[i] = audio[i] + this._preEmphasisCoeff * result[i - 1];
    }
    return result;
  }

  generateWindow(size: number): number[] {
    const window = new Array(size);
    switch (this._windowType) {
      case 'hamming':
        for (let i = 0; i < size; i++) {
          window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
        }
        break;
      case 'hanning':
        for (let i = 0; i < size; i++) {
          window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
        }
        break;
      case 'blackman':
        for (let i = 0; i < size; i++) {
          const n = (2 * Math.PI * i) / (size - 1);
          window[i] = 0.42 - 0.5 * Math.cos(n) + 0.08 * Math.cos(2 * n);
        }
        break;
      case 'rectangular':
        window.fill(1);
        break;
      case 'gaussian':
        const sigma = 0.4;
        const mid = (size - 1) / 2;
        for (let i = 0; i < size; i++) {
          window[i] = Math.exp(-0.5 * Math.pow((i - mid) / (sigma * mid), 2));
        }
        break;
      default:
        window.fill(1);
    }
    return window;
  }

  computeFrameEnergy(frame: number[]): number {
    let energy = 0;
    for (const sample of frame) {
      energy += sample * sample;
    }
    return Math.sqrt(energy / frame.length);
  }

  computeZCR(frame: number[]): number {
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / frame.length;
  }

  frameAudio(audio: number[]): AudioFrame[] {
    const frames: AudioFrame[] = [];
    const window = this.generateWindow(this._frameSize);
    let index = 0;
    for (let start = 0; start + this._frameSize <= audio.length; start += this._hopSize) {
      const frameSamples = new Array(this._frameSize);
      for (let i = 0; i < this._frameSize; i++) {
        frameSamples[i] = audio[start + i] * window[i];
      }
      frames.push({
        index,
        samples: frameSamples,
        energy: this.computeFrameEnergy(frameSamples),
        zcr: this.computeZCR(frameSamples),
        timestamp: start / this._sampleRate
      });
      index++;
    }
    return frames;
  }

  denoise(audio: number[]): number[] {
    if (audio.length === 0) {
      return [];
    }
    this._snrBefore = this._estimateSNR(audio);
    let result: number[];
    switch (this._denoiseMethod) {
      case 'spectral':
        result = this._spectralDenoise(audio);
        break;
      case 'wiener':
        result = this._wienerDenoise(audio);
        break;
      case 'spectral_subtraction':
        result = this._spectralSubtraction(audio);
        break;
      case 'mmse':
        result = this._mmseDenoise(audio);
        break;
      case 'none':
      default:
        result = [...audio];
    }
    this._snrAfter = this._estimateSNR(result);
    return result;
  }

  private _estimateSNR(audio: number[]): number {
    if (audio.length < 100) {
      return 20;
    }
    let signalPower = 0;
    let noisePower = 0;
    const noiseSamples = Math.min(1000, Math.floor(audio.length * 0.1));
    for (let i = 0; i < noiseSamples; i++) {
      noisePower += audio[i] * audio[i];
    }
    noisePower /= noiseSamples;
    for (const sample of audio) {
      signalPower += sample * sample;
    }
    signalPower /= audio.length;
    if (noisePower === 0) {
      return 60;
    }
    return 10 * Math.log10(signalPower / noisePower);
  }

  private _spectralDenoise(audio: number[]): number[] {
    const frames = this.frameAudio(audio);
    const result = new Array(audio.length).fill(0);
    const window = this.generateWindow(this._frameSize);
    for (let f = 0; f < frames.length; f++) {
      const frame = frames[f].samples;
      const spectrum = this._fftMagnitude(frame);
      const cleaned = new Array(spectrum.length);
      for (let i = 0; i < spectrum.length; i++) {
        const noiseEst = this._noiseProfile[i % this._noiseProfile.length];
        const ratio = (spectrum[i] - 2 * noiseEst) / spectrum[i];
        cleaned[i] = Math.max(ratio, 0.01) * spectrum[i];
      }
      const cleanedFrame = this._ifftMagnitude(cleaned, frame);
      const start = f * this._hopSize;
      for (let i = 0; i < this._frameSize && start + i < audio.length; i++) {
        result[start + i] += cleanedFrame[i] * window[i];
      }
    }
    return result;
  }

  private _wienerDenoise(audio: number[]): number[] {
    const frames = this.frameAudio(audio);
    const result = new Array(audio.length).fill(0);
    const window = this.generateWindow(this._frameSize);
    for (let f = 0; f < frames.length; f++) {
      const frame = frames[f].samples;
      const spectrum = this._fftMagnitude(frame);
      const cleaned = new Array(spectrum.length);
      for (let i = 0; i < spectrum.length; i++) {
        const noiseVar = this._noiseProfile[i % this._noiseProfile.length] ** 2;
        const signalVar = Math.max(spectrum[i] ** 2 - noiseVar, 0);
        const gain = signalVar / (signalVar + noiseVar);
        cleaned[i] = gain * spectrum[i];
      }
      const cleanedFrame = this._ifftMagnitude(cleaned, frame);
      const start = f * this._hopSize;
      for (let i = 0; i < this._frameSize && start + i < audio.length; i++) {
        result[start + i] += cleanedFrame[i] * window[i];
      }
    }
    return result;
  }

  private _spectralSubtraction(audio: number[]): number[] {
    const frames = this.frameAudio(audio);
    const result = new Array(audio.length).fill(0);
    const window = this.generateWindow(this._frameSize);
    const alpha = 2;
    const beta = 0.01;
    for (let f = 0; f < frames.length; f++) {
      const frame = frames[f].samples;
      const spectrum = this._fftMagnitude(frame);
      const cleaned = new Array(spectrum.length);
      for (let i = 0; i < spectrum.length; i++) {
        const noiseEst = this._noiseProfile[i % this._noiseProfile.length];
        const sub = Math.pow(spectrum[i], alpha) - Math.pow(noiseEst, alpha);
        cleaned[i] = Math.pow(Math.max(sub, beta * Math.pow(noiseEst, alpha)), 1 / alpha);
      }
      const cleanedFrame = this._ifftMagnitude(cleaned, frame);
      const start = f * this._hopSize;
      for (let i = 0; i < this._frameSize && start + i < audio.length; i++) {
        result[start + i] += cleanedFrame[i] * window[i];
      }
    }
    return result;
  }

  private _mmseDenoise(audio: number[]): number[] {
    const frames = this.frameAudio(audio);
    const result = new Array(audio.length).fill(0);
    const window = this.generateWindow(this._frameSize);
    for (let f = 0; f < frames.length; f++) {
      const frame = frames[f].samples;
      const spectrum = this._fftMagnitude(frame);
      const cleaned = new Array(spectrum.length);
      for (let i = 0; i < spectrum.length; i++) {
        const noiseEst = this._noiseProfile[i % this._noiseProfile.length];
        const snr = (spectrum[i] * spectrum[i]) / (noiseEst * noiseEst) - 1;
        const xi = Math.max(snr, 0.1);
        const gamma = 1 + xi;
        const v = xi / gamma * (spectrum[i] * spectrum[i]) / (noiseEst * noiseEst);
        let mmseGain = (Math.sqrt(Math.PI) / 2) * Math.sqrt(v) / gamma;
        mmseGain *= Math.exp(-v / 2);
        mmseGain *= (1 + v) * besselI0(v / 2) + v * besselI1(v / 2);
        mmseGain = Math.min(Math.max(mmseGain, 0.01), 1);
        cleaned[i] = mmseGain * spectrum[i];
      }
      const cleanedFrame = this._ifftMagnitude(cleaned, frame);
      const start = f * this._hopSize;
      for (let i = 0; i < this._frameSize && start + i < audio.length; i++) {
        result[start + i] += cleanedFrame[i] * window[i];
      }
    }
    return result;
  }

  private _fftMagnitude(signal: number[]): number[] {
    const n = signal.length;
    const magnitudes = new Array(n / 2 + 1);
    for (let k = 0; k <= n / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = (-2 * Math.PI * k * t) / n;
        real += signal[t] * Math.cos(angle);
        imag += signal[t] * Math.sin(angle);
      }
      magnitudes[k] = Math.sqrt(real * real + imag * imag) / n;
    }
    return magnitudes;
  }

  private _ifftMagnitude(magnitudes: number[], original: number[]): number[] {
    const n = original.length;
    const result = new Array(n);
    const phases = new Array(n / 2 + 1);
    const origSpectrum = this._fft(original);
    for (let i = 0; i <= n / 2; i++) {
      phases[i] = Math.atan2(origSpectrum[i].imag, origSpectrum[i].real);
    }
    const complex = new Array<{ real: number; imag: number }>(n);
    for (let i = 0; i <= n / 2; i++) {
      complex[i] = {
        real: magnitudes[i] * Math.cos(phases[i]),
        imag: magnitudes[i] * Math.sin(phases[i])
      };
    }
    for (let i = n / 2 + 1; i < n; i++) {
      const mirror = n - i;
      complex[i] = { real: complex[mirror].real, imag: -complex[mirror].imag };
    }
    for (let t = 0; t < n; t++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        const angle = (2 * Math.PI * k * t) / n;
        sum += complex[k].real * Math.cos(angle) - complex[k].imag * Math.sin(angle);
      }
      result[t] = sum / n;
    }
    return result;
  }

  private _fft(signal: number[]): { real: number; imag: number }[] {
    const n = signal.length;
    const result = new Array<{ real: number; imag: number }>(n);
    for (let k = 0; k < n; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = (-2 * Math.PI * k * t) / n;
        real += signal[t] * Math.cos(angle);
        imag += signal[t] * Math.sin(angle);
      }
      result[k] = { real, imag };
    }
    return result;
  }

  estimateNoiseProfile(audio: number[], duration: number = 0.1): void {
    const samples = Math.floor(duration * this._sampleRate);
    const noiseSamples = audio.slice(0, Math.min(samples, audio.length));
    const frames = this.frameAudio(noiseSamples);
    if (frames.length === 0) {
      return;
    }
    const binCount = this._frameSize / 2 + 1;
    this._noiseProfile = new Array(binCount).fill(0);
    for (const frame of frames) {
      const spectrum = this._fftMagnitude(frame.samples);
      for (let i = 0; i < binCount; i++) {
        this._noiseProfile[i] += spectrum[i];
      }
    }
    for (let i = 0; i < binCount; i++) {
      this._noiseProfile[i] /= frames.length;
    }
  }

  normalize(audio: number[]): number[] {
    if (audio.length === 0) {
      return [];
    }
    this._originalPeak = 0;
    for (const sample of audio) {
      this._originalPeak = Math.max(this._originalPeak, Math.abs(sample));
    }
    if (this._originalPeak === 0) {
      this._gain = 1;
      return [...audio];
    }
    switch (this._normalizationMethod) {
      case 'peak':
        this._gain = this._targetPeak / this._originalPeak;
        break;
      case 'rms':
        let rms = 0;
        for (const sample of audio) {
          rms += sample * sample;
        }
        rms = Math.sqrt(rms / audio.length);
        const targetRms = this._targetPeak * 0.3;
        this._gain = rms > 0 ? targetRms / rms : 1;
        break;
      case 'loudness':
        this._gain = this._targetPeak / Math.max(this._originalPeak, 0.01);
        break;
      case 'none':
      default:
        this._gain = 1;
    }
    return audio.map(s => s * this._gain);
  }

  vad(frames: AudioFrame[], threshold: number = 0.02): boolean[] {
    return frames.map(frame => frame.energy > threshold);
  }

  process(audio: number[], sampleRate?: number): PreprocessingResult {
    if (sampleRate) {
      this._sampleRate = sampleRate;
    }
    this._audioData = [...audio];
    const preEmphasized = this.preEmphasize(this._audioData);
    const denoised = this.denoise(preEmphasized);
    const normalized = this.normalize(denoised);
    this._frames = this.frameAudio(normalized);
    const result: PreprocessingResult = {
      audioData: normalized,
      sampleRate: this._sampleRate,
      duration: this.duration,
      frames: this._frames,
      frameCount: this._frames.length,
      denoise: {
        method: this._denoiseMethod,
        noiseProfile: [...this._noiseProfile],
        snrBefore: this._snrBefore,
        snrAfter: this._snrAfter
      },
      normalization: {
        method: this._normalizationMethod,
        originalPeak: this._originalPeak,
        targetPeak: this._targetPeak,
        gain: this._gain
      },
      preEmphasisCoeff: this._preEmphasisCoeff,
      windowType: this._windowType,
      frameSize: this._frameSize,
      hopSize: this._hopSize
    };
    this._lastResult = result;
    return result;
  }

  toPacket(): DataPacket<PreprocessingResult> {
    const result = this._lastResult || {
      audioData: this._audioData,
      sampleRate: this._sampleRate,
      duration: this.duration,
      frames: this._frames,
      frameCount: this._frames.length,
      denoise: {
        method: this._denoiseMethod,
        noiseProfile: [...this._noiseProfile],
        snrBefore: this._snrBefore,
        snrAfter: this._snrAfter
      },
      normalization: {
        method: this._normalizationMethod,
        originalPeak: this._originalPeak,
        targetPeak: this._targetPeak,
        gain: this._gain
      },
      preEmphasisCoeff: this._preEmphasisCoeff,
      windowType: this._windowType,
      frameSize: this._frameSize,
      hopSize: this._hopSize
    };
    this._counter++;
    return {
      id: `audio-preprocessing-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech_recognition', 'audio_preprocessing'],
        priority: 1,
        phase: 'preprocessing'
      }
    };
  }

  reset(): void {
    this._audioData = [];
    this._sampleRate = 16000;
    this._frameSize = 512;
    this._hopSize = 256;
    this._preEmphasisCoeff = 0.97;
    this._windowType = 'hamming';
    this._frames = [];
    this._denoiseMethod = 'spectral';
    this._normalizationMethod = 'peak';
    this._targetPeak = 0.9;
    this._counter = 0;
    this._lastResult = null;
    this._snrBefore = 0;
    this._snrAfter = 0;
    this._originalPeak = 0;
    this._gain = 1;
    this._initDefaultNoiseProfile();
  }
}

function besselI0(x: number): number {
  let sum = 1;
  let term = 1;
  for (let i = 1; i <= 10; i++) {
    term *= (x / 2) * (x / 2) / (i * i);
    sum += term;
  }
  return sum;
}

function besselI1(x: number): number {
  let sum = x / 2;
  let term = x / 2;
  for (let i = 1; i <= 10; i++) {
    term *= (x / 2) * (x / 2) / (i * (i + 1));
    sum += term;
  }
  return sum;
}
