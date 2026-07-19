import { DataPacket } from '../shared/types';

export interface MFCCFrame {
  index: number;
  mfcc: number[];
  delta: number[];
  deltaDelta: number[];
  energy: number;
}

export interface LPCCFrame {
  index: number;
  lpc: number[];
  lpcc: number[];
  reflectionCoeffs: number[];
  gain: number;
}

export interface PLPFrame {
  index: number;
  plp: number[];
  aspectrum: number[];
  lpc: number[];
}

export interface SpectralFeature {
  centroid: number;
  bandwidth: number;
  rolloff: number;
  flux: number;
  flatness: number;
  entropy: number;
  skewness: number;
  kurtosis: number;
}

export interface FeatureSequence {
  mfcc: MFCCFrame[];
  lpcc: LPCCFrame[];
  plp: PLPFrame[];
  spectral: SpectralFeature[];
}

export interface ExtractionResult {
  features: FeatureSequence;
  frameCount: number;
  sampleRate: number;
  frameSize: number;
  hopSize: number;
  numMfcc: number;
  numLpc: number;
  numPlp: number;
  numFilters: number;
  fftSize: number;
  lowFreq: number;
  highFreq: number;
  method: string[];
}

export class FeatureExtraction {
  private _sampleRate: number = 16000;
  private _frameSize: number = 512;
  private _hopSize: number = 256;
  private _fftSize: number = 512;
  private _numMfcc: number = 13;
  private _numLpc: number = 12;
  private _numPlp: number = 13;
  private _numFilters: number = 26;
  private _lowFreq: number = 0;
  private _highFreq: number = 8000;
  private _preEmphasis: number = 0.97;
  private _windowType: string = 'hamming';
  private _useEnergy: boolean = true;
  private _useDelta: boolean = true;
  private _useDeltaDelta: boolean = true;
  private _methods: string[] = ['mfcc'];
  private _mfccFeatures: MFCCFrame[] = [];
  private _lpccFeatures: LPCCFrame[] = [];
  private _plpFeatures: PLPFrame[] = [];
  private _spectralFeatures: SpectralFeature[] = [];
  private _filterBank: number[][] = [];
  private _counter: number = 0;
  private _lastResult: ExtractionResult | null = null;

  constructor() {
    this._computeMelFilterBank();
  }

  private _computeMelFilterBank(): void {
    this._filterBank = new Array(this._numFilters);
    const lowMel = this._hzToMel(this._lowFreq);
    const highMel = this._hzToMel(this._highFreq);
    const melPoints = new Array(this._numFilters + 2);
    for (let i = 0; i < this._numFilters + 2; i++) {
      melPoints[i] = lowMel + (i * (highMel - lowMel)) / (this._numFilters + 1);
    }
    const hzPoints = melPoints.map(m => this._melToHz(m));
    const binPoints = hzPoints.map(h => Math.floor((this._fftSize + 1) * h / this._sampleRate));
    for (let i = 0; i < this._numFilters; i++) {
      const left = binPoints[i];
      const center = binPoints[i + 1];
      const right = binPoints[i + 2];
      this._filterBank[i] = new Array(this._fftSize / 2 + 1).fill(0);
      for (let j = left; j < center; j++) {
        this._filterBank[i][j] = (j - left) / (center - left);
      }
      for (let j = center; j < right; j++) {
        this._filterBank[i][j] = (right - j) / (right - center);
      }
    }
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

  get fftSize(): number {
    return this._fftSize;
  }

  get numMfcc(): number {
    return this._numMfcc;
  }

  get numLpc(): number {
    return this._numLpc;
  }

  get numPlp(): number {
    return this._numPlp;
  }

  get numFilters(): number {
    return this._numFilters;
  }

  get lowFreq(): number {
    return this._lowFreq;
  }

  get highFreq(): number {
    return this._highFreq;
  }

  get methods(): string[] {
    return [...this._methods];
  }

  get mfccFeatures(): MFCCFrame[] {
    return this._mfccFeatures;
  }

  get lpccFeatures(): LPCCFrame[] {
    return this._lpccFeatures;
  }

  get plpFeatures(): PLPFrame[] {
    return this._plpFeatures;
  }

  get spectralFeatures(): SpectralFeature[] {
    return this._spectralFeatures;
  }

  setSampleRate(rate: number): void {
    this._sampleRate = rate;
    this._computeMelFilterBank();
  }

  setFrameSize(size: number): void {
    this._frameSize = size;
    if (this._fftSize < size) {
      this._fftSize = size;
    }
    this._computeMelFilterBank();
  }

  setHopSize(size: number): void {
    this._hopSize = size;
  }

  setFftSize(size: number): void {
    this._fftSize = size;
    this._computeMelFilterBank();
  }

  setNumMfcc(n: number): void {
    this._numMfcc = n;
  }

  setNumLpc(n: number): void {
    this._numLpc = n;
  }

  setNumPlp(n: number): void {
    this._numPlp = n;
  }

  setNumFilters(n: number): void {
    this._numFilters = n;
    this._computeMelFilterBank();
  }

  setFreqRange(low: number, high: number): void {
    this._lowFreq = low;
    this._highFreq = high;
    this._computeMelFilterBank();
  }

  setMethods(methods: string[]): void {
    this._methods = [...methods];
  }

  setUseEnergy(use: boolean): void {
    this._useEnergy = use;
  }

  setUseDelta(use: boolean): void {
    this._useDelta = use;
  }

  setUseDeltaDelta(use: boolean): void {
    this._useDeltaDelta = use;
  }

  private _hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }

  private _melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  private _generateWindow(size: number): number[] {
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
      default:
        window.fill(1);
    }
    return window;
  }

  private _fft(signal: number[]): { real: number[]; imag: number[] } {
    const n = signal.length;
    const real = new Array(n);
    const imag = new Array(n);
    for (let k = 0; k < n; k++) {
      let r = 0;
      let im = 0;
      for (let t = 0; t < n; t++) {
        const angle = (-2 * Math.PI * k * t) / n;
        r += signal[t] * Math.cos(angle);
        im += signal[t] * Math.sin(angle);
      }
      real[k] = r;
      imag[k] = im;
    }
    return { real, imag };
  }

  private _powerSpectrum(frame: number[]): number[] {
    const padded = new Array(this._fftSize).fill(0);
    for (let i = 0; i < frame.length; i++) {
      padded[i] = frame[i];
    }
    const { real, imag } = this._fft(padded);
    const spectrum = new Array(this._fftSize / 2 + 1);
    for (let i = 0; i <= this._fftSize / 2; i++) {
      spectrum[i] = (real[i] * real[i] + imag[i] * imag[i]) / this._fftSize;
    }
    return spectrum;
  }

  private _magnitudeSpectrum(frame: number[]): number[] {
    const padded = new Array(this._fftSize).fill(0);
    for (let i = 0; i < frame.length; i++) {
      padded[i] = frame[i];
    }
    const { real, imag } = this._fft(padded);
    const spectrum = new Array(this._fftSize / 2 + 1);
    for (let i = 0; i <= this._fftSize / 2; i++) {
      spectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / this._fftSize;
    }
    return spectrum;
  }

  computeMFCC(audio: number[]): MFCCFrame[] {
    const frames = this._frameAudio(audio);
    const mfccFrames: MFCCFrame[] = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const energy = this._computeFrameEnergy(frame);
      const spectrum = this._powerSpectrum(frame);
      const filterBankEnergies = new Array(this._numFilters);
      for (let f = 0; f < this._numFilters; f++) {
        let sum = 0;
        for (let j = 0; j < spectrum.length; j++) {
          sum += spectrum[j] * this._filterBank[f][j];
        }
        filterBankEnergies[f] = Math.log(Math.max(sum, 1e-10));
      }
      const mfcc = this._dct(filterBankEnergies, this._numMfcc);
      if (this._useEnergy) {
        mfcc[0] = Math.log(Math.max(energy, 1e-10));
      }
      mfccFrames.push({
        index: i,
        mfcc,
        delta: [],
        deltaDelta: [],
        energy
      });
    }
    if (this._useDelta && mfccFrames.length > 1) {
      this._computeDeltas(mfccFrames, 'delta', 2);
    }
    if (this._useDeltaDelta && mfccFrames.length > 1) {
      this._computeDeltas(mfccFrames, 'deltaDelta', 2);
    }
    return mfccFrames;
  }

  private _dct(input: number[], numCoeffs: number): number[] {
    const n = input.length;
    const result = new Array(numCoeffs);
    for (let k = 0; k < numCoeffs; k++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += input[i] * Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
      }
      result[k] = sum * 2;
    }
    return result;
  }

  private _computeDeltas(frames: MFCCFrame[], type: 'delta' | 'deltaDelta', window: number): void {
    const n = frames.length;
    const src = type === 'deltaDelta' ? frames.map(f => f.delta) : frames.map(f => f.mfcc);
    const nCoeffs = src[0].length;
    for (let i = 0; i < n; i++) {
      const delta = new Array(nCoeffs).fill(0);
      let norm = 0;
      for (let w = 1; w <= window; w++) {
        const prev = Math.max(0, i - w);
        const next = Math.min(n - 1, i + w);
        for (let c = 0; c < nCoeffs; c++) {
          delta[c] += w * (src[next][c] - src[prev][c]);
        }
        norm += 2 * w * w;
      }
      for (let c = 0; c < nCoeffs; c++) {
        delta[c] /= norm;
      }
      if (type === 'delta') {
        frames[i].delta = delta;
      } else {
        frames[i].deltaDelta = delta;
      }
    }
  }

  computeLPCC(audio: number[]): LPCCFrame[] {
    const frames = this._frameAudio(audio);
    const lpccFrames: LPCCFrame[] = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const { lpc, gain, reflection } = this._levinsonDurbin(frame, this._numLpc);
      const lpcc = this._lpcToLpcc(lpc, gain, this._numLpc);
      lpccFrames.push({
        index: i,
        lpc,
        lpcc,
        reflectionCoeffs: reflection,
        gain
      });
    }
    return lpccFrames;
  }

  private _levinsonDurbin(frame: number[], order: number): { lpc: number[]; gain: number; reflection: number[] } {
    const n = frame.length;
    const r = new Array(order + 1).fill(0);
    for (let i = 0; i <= order; i++) {
      for (let j = 0; j < n - i; j++) {
        r[i] += frame[j] * frame[j + i];
      }
    }
    const lpc = new Array(order + 1).fill(0);
    const reflection = new Array(order).fill(0);
    lpc[0] = 1;
    let e = r[0];
    for (let i = 1; i <= order; i++) {
      let sum = 0;
      for (let j = 1; j < i; j++) {
        sum += lpc[j] * r[i - j];
      }
      const k = -(r[i] + sum) / e;
      reflection[i - 1] = k;
      lpc[i] = k;
      for (let j = 1; j < i; j++) {
        lpc[j] += k * lpc[i - j];
      }
      e *= 1 - k * k;
    }
    return { lpc, gain: Math.sqrt(Math.max(e, 1e-10)), reflection };
  }

  private _lpcToLpcc(lpc: number[], gain: number, order: number): number[] {
    const lpcc = new Array(order);
    lpcc[0] = Math.log(Math.max(gain, 1e-10));
    for (let n = 1; n < order; n++) {
      let sum = 0;
      for (let k = 1; k < n; k++) {
        sum += k * lpcc[k] * lpc[n - k] / n;
      }
      lpcc[n] = -lpc[n] - sum;
    }
    return lpcc;
  }

  computePLP(audio: number[]): PLPFrame[] {
    const frames = this._frameAudio(audio);
    const plpFrames: PLPFrame[] = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const spectrum = this._powerSpectrum(frame);
      const aspectrum = this._auditorySpectrum(spectrum);
      const { lpc } = this._levinsonDurbin(this._autocorrFromSpectrum(aspectrum), this._numPlp - 1);
      const plp = this._lpcToLpcc(lpc, 1, this._numPlp);
      plpFrames.push({
        index: i,
        plp,
        aspectrum,
        lpc
      });
    }
    return plpFrames;
  }

  private _auditorySpectrum(spectrum: number[]): number[] {
    const barkBins = this._barkScaleBins(spectrum.length);
    const auditory = new Array(barkBins);
    for (let b = 0; b < barkBins; b++) {
      let sum = 0;
      const bandEdges = this._barkBandEdges(b, spectrum.length);
      for (let j = bandEdges[0]; j <= bandEdges[1]; j++) {
        sum += spectrum[j];
      }
      const loudness = Math.pow(Math.max(sum, 1e-10), 0.33);
      auditory[b] = loudness;
    }
    return auditory;
  }

  private _barkScaleBins(n: number): number {
    return Math.floor(25 * n / (this._fftSize / 2 + 1)) + 1;
  }

  private _barkBandEdges(bark: number, n: number): [number, number] {
    const freq = this._barkToHz(bark);
    const bin = Math.floor(freq * this._fftSize / this._sampleRate);
    const width = Math.max(1, Math.floor(bin * 0.1));
    return [Math.max(0, bin - width), Math.min(n - 1, bin + width)];
  }

  private _barkToHz(bark: number): number {
    return 600 * Math.sinh(bark / 6);
  }

  private _autocorrFromSpectrum(spectrum: number[]): number[] {
    const n = spectrum.length * 2 - 2;
    const fullSpec = new Array(n).fill(0);
    for (let i = 0; i < spectrum.length; i++) {
      fullSpec[i] = spectrum[i];
      fullSpec[n - i] = spectrum[i];
    }
    const autocorr = new Array(this._numPlp).fill(0);
    for (let i = 0; i < this._numPlp; i++) {
      for (let j = 0; j < n - i; j++) {
        autocorr[i] += fullSpec[j] * fullSpec[j + i];
      }
    }
    return autocorr;
  }

  computeSpectralFeatures(audio: number[]): SpectralFeature[] {
    const frames = this._frameAudio(audio);
    const features: SpectralFeature[] = [];
    let prevSpectrum: number[] | null = null;
    for (const frame of frames) {
      const spectrum = this._magnitudeSpectrum(frame);
      const centroid = this._spectralCentroid(spectrum);
      const bandwidth = this._spectralBandwidth(spectrum, centroid);
      const rolloff = this._spectralRolloff(spectrum);
      const flux = this._spectralFlux(spectrum, prevSpectrum);
      const flatness = this._spectralFlatness(spectrum);
      const entropy = this._spectralEntropy(spectrum);
      const { skewness, kurtosis } = this._spectralMoments(spectrum, centroid, bandwidth);
      features.push({
        centroid,
        bandwidth,
        rolloff,
        flux,
        flatness,
        entropy,
        skewness,
        kurtosis
      });
      prevSpectrum = spectrum;
    }
    return features;
  }

  private _spectralCentroid(spectrum: number[]): number {
    let sum = 0;
    let weightedSum = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const freq = (i * this._sampleRate) / this._fftSize;
      weightedSum += freq * spectrum[i];
      sum += spectrum[i];
    }
    return sum > 0 ? weightedSum / sum : 0;
  }

  private _spectralBandwidth(spectrum: number[], centroid: number): number {
    let sum = 0;
    let weightedSum = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const freq = (i * this._sampleRate) / this._fftSize;
      const diff = freq - centroid;
      weightedSum += diff * diff * spectrum[i];
      sum += spectrum[i];
    }
    return sum > 0 ? Math.sqrt(weightedSum / sum) : 0;
  }

  private _spectralRolloff(spectrum: number[]): number {
    let total = 0;
    for (const s of spectrum) {
      total += s;
    }
    const threshold = total * 0.85;
    let cumulative = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulative += spectrum[i];
      if (cumulative >= threshold) {
        return (i * this._sampleRate) / this._fftSize;
      }
    }
    return 0;
  }

  private _spectralFlux(spectrum: number[], prev: number[] | null): number {
    if (!prev) {
      return 0;
    }
    let flux = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const diff = spectrum[i] - prev[i];
      flux += diff > 0 ? diff : 0;
    }
    return flux / spectrum.length;
  }

  private _spectralFlatness(spectrum: number[]): number {
    let sum = 0;
    let logSum = 0;
    const n = spectrum.length;
    for (const s of spectrum) {
      const val = Math.max(s, 1e-10);
      sum += val;
      logSum += Math.log(val);
    }
    const am = sum / n;
    const gm = Math.exp(logSum / n);
    return am > 0 ? gm / am : 0;
  }

  private _spectralEntropy(spectrum: number[]): number {
    let sum = 0;
    for (const s of spectrum) {
      sum += s;
    }
    if (sum === 0) {
      return 0;
    }
    let entropy = 0;
    for (const s of spectrum) {
      const p = s / sum;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  private _spectralMoments(spectrum: number[], centroid: number, bandwidth: number): { skewness: number; kurtosis: number } {
    let sum = 0;
    let m3 = 0;
    let m4 = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const freq = (i * this._sampleRate) / this._fftSize;
      const diff = freq - centroid;
      m3 += diff * diff * diff * spectrum[i];
      m4 += diff * diff * diff * diff * spectrum[i];
      sum += spectrum[i];
    }
    const skewness = sum > 0 && bandwidth > 0 ? m3 / (sum * bandwidth * bandwidth * bandwidth) : 0;
    const kurtosis = sum > 0 && bandwidth > 0 ? m4 / (sum * bandwidth * bandwidth * bandwidth * bandwidth) - 3 : 0;
    return { skewness, kurtosis };
  }

  private _frameAudio(audio: number[]): number[][] {
    const frames: number[][] = [];
    const window = this._generateWindow(this._frameSize);
    let preEmphasized = [...audio];
    for (let i = audio.length - 1; i > 0; i--) {
      preEmphasized[i] -= this._preEmphasis * audio[i - 1];
    }
    for (let start = 0; start + this._frameSize <= audio.length; start += this._hopSize) {
      const frame = new Array(this._frameSize);
      for (let i = 0; i < this._frameSize; i++) {
        frame[i] = preEmphasized[start + i] * window[i];
      }
      frames.push(frame);
    }
    return frames;
  }

  private _computeFrameEnergy(frame: number[]): number {
    let energy = 0;
    for (const sample of frame) {
      energy += sample * sample;
    }
    return Math.sqrt(energy / frame.length);
  }

  extract(audio: number[], sampleRate?: number): ExtractionResult {
    if (sampleRate) {
      this._sampleRate = sampleRate;
      this._computeMelFilterBank();
    }
    if (this._methods.includes('mfcc')) {
      this._mfccFeatures = this.computeMFCC(audio);
    }
    if (this._methods.includes('lpcc')) {
      this._lpccFeatures = this.computeLPCC(audio);
    }
    if (this._methods.includes('plp')) {
      this._plpFeatures = this.computePLP(audio);
    }
    if (this._methods.includes('spectral')) {
      this._spectralFeatures = this.computeSpectralFeatures(audio);
    }
    const frameCount = this._mfccFeatures.length || this._lpccFeatures.length || this._plpFeatures.length || this._spectralFeatures.length;
    const result: ExtractionResult = {
      features: {
        mfcc: this._mfccFeatures,
        lpcc: this._lpccFeatures,
        plp: this._plpFeatures,
        spectral: this._spectralFeatures
      },
      frameCount,
      sampleRate: this._sampleRate,
      frameSize: this._frameSize,
      hopSize: this._hopSize,
      numMfcc: this._numMfcc,
      numLpc: this._numLpc,
      numPlp: this._numPlp,
      numFilters: this._numFilters,
      fftSize: this._fftSize,
      lowFreq: this._lowFreq,
      highFreq: this._highFreq,
      method: [...this._methods]
    };
    this._lastResult = result;
    return result;
  }

  toPacket(): DataPacket<ExtractionResult> {
    const result = this._lastResult || {
      features: {
        mfcc: this._mfccFeatures,
        lpcc: this._lpccFeatures,
        plp: this._plpFeatures,
        spectral: this._spectralFeatures
      },
      frameCount: this._mfccFeatures.length,
      sampleRate: this._sampleRate,
      frameSize: this._frameSize,
      hopSize: this._hopSize,
      numMfcc: this._numMfcc,
      numLpc: this._numLpc,
      numPlp: this._numPlp,
      numFilters: this._numFilters,
      fftSize: this._fftSize,
      lowFreq: this._lowFreq,
      highFreq: this._highFreq,
      method: [...this._methods]
    };
    this._counter++;
    return {
      id: `feature-extraction-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech_recognition', 'feature_extraction'],
        priority: 1,
        phase: 'feature_extraction'
      }
    };
  }

  reset(): void {
    this._sampleRate = 16000;
    this._frameSize = 512;
    this._hopSize = 256;
    this._fftSize = 512;
    this._numMfcc = 13;
    this._numLpc = 12;
    this._numPlp = 13;
    this._numFilters = 26;
    this._lowFreq = 0;
    this._highFreq = 8000;
    this._preEmphasis = 0.97;
    this._windowType = 'hamming';
    this._useEnergy = true;
    this._useDelta = true;
    this._useDeltaDelta = true;
    this._methods = ['mfcc'];
    this._mfccFeatures = [];
    this._lpccFeatures = [];
    this._plpFeatures = [];
    this._spectralFeatures = [];
    this._counter = 0;
    this._lastResult = null;
    this._computeMelFilterBank();
  }
}
