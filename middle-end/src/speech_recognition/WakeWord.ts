import { DataPacket } from '../shared/types';

export interface WakeWordModel {
  name: string;
  keywords: string[];
  threshold: number;
  modelType: string;
  sampleRate: number;
  windowSize: number;
  hopSize: number;
  featureType: string;
  embeddingDim: number;
}

export interface KeywordSpottingResult {
  keyword: string;
  detected: boolean;
  confidence: number;
  score: number;
  threshold: number;
  startTime: number;
  endTime: number;
  startFrame: number;
  endFrame: number;
  frameIndex: number;
}

export interface DetectionEvent {
  id: string;
  keyword: string;
  confidence: number;
  score: number;
  timestamp: number;
  duration: number;
  sampleRate: number;
  isVerified: boolean;
}

export interface ConfidenceMetrics {
  averageConfidence: number;
  maxConfidence: number;
  minConfidence: number;
  stdDevConfidence: number;
  falseAlarmRate: number;
  missRate: number;
  detectionRate: number;
}

export interface WakeWordState {
  isListening: boolean;
  currentKeyword: string;
  buffer: number[];
  bufferSize: number;
  lastDetectionTime: number;
  detectionCount: number;
  falseAlarmCount: number;
  totalAudioDuration: number;
}

export interface AudioBuffer {
  samples: number[];
  sampleRate: number;
  timestamp: number;
  duration: number;
}

export interface WakeWordResult {
  model: WakeWordModel;
  detections: DetectionEvent[];
  spotResults: KeywordSpottingResult[];
  state: WakeWordState;
  metrics: ConfidenceMetrics;
  keywords: string[];
  numKeywords: number;
  threshold: number;
  detectionCount: number;
  isDetected: boolean;
  bestKeyword: string;
  bestConfidence: number;
  latency: number;
}

export class WakeWord {
  private _modelType: string = 'cnn';
  private _sampleRate: number = 16000;
  private _windowSize: number = 512;
  private _hopSize: number = 256;
  private _featureType: string = 'mfcc';
  private _embeddingDim: number = 128;
  private _threshold: number = 0.8;
  private _keywords: string[] = ['hey trae', 'ok trae', 'wake up'];
  private _keywordModels: Map<string, WakeWordModel> = new Map();
  private _detections: DetectionEvent[] = [];
  private _spotResults: KeywordSpottingResult[] = [];
  private _buffer: number[] = [];
  private _bufferSize: number = 16000;
  private _isListening: boolean = false;
  private _lastDetectionTime: number = 0;
  private _detectionCount: number = 0;
  private _falseAlarmCount: number = 0;
  private _totalAudioDuration: number = 0;
  private _minDetectInterval: number = 1000;
  private _verificationThreshold: number = 0.85;
  private _useVerification: boolean = true;
  private _smoothingWindow: number = 5;
  private _smoothedScores: number[] = [];
  private _counter: number = 0;
  private _lastResult: WakeWordResult | null = null;
  private _latency: number = 0;
  private _bestKeyword: string = '';
  private _bestConfidence: number = 0;
  private _isDetected: boolean = false;

  constructor() {
    this._initKeywordModels();
  }

  private _initKeywordModels(): void {
    for (const kw of this._keywords) {
      const model: WakeWordModel = {
        name: kw,
        keywords: [kw],
        threshold: this._threshold,
        modelType: this._modelType,
        sampleRate: this._sampleRate,
        windowSize: this._windowSize,
        hopSize: this._hopSize,
        featureType: this._featureType,
        embeddingDim: this._embeddingDim
      };
      this._keywordModels.set(kw, model);
    }
  }

  get modelType(): string {
    return this._modelType;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  get windowSize(): number {
    return this._windowSize;
  }

  get hopSize(): number {
    return this._hopSize;
  }

  get featureType(): string {
    return this._featureType;
  }

  get embeddingDim(): number {
    return this._embeddingDim;
  }

  get threshold(): number {
    return this._threshold;
  }

  get keywords(): string[] {
    return [...this._keywords];
  }

  get numKeywords(): number {
    return this._keywords.length;
  }

  get detections(): DetectionEvent[] {
    return [...this._detections];
  }

  get spotResults(): KeywordSpottingResult[] {
    return [...this._spotResults];
  }

  get isListening(): boolean {
    return this._isListening;
  }

  get detectionCount(): number {
    return this._detectionCount;
  }

  get falseAlarmCount(): number {
    return this._falseAlarmCount;
  }

  get totalAudioDuration(): number {
    return this._totalAudioDuration;
  }

  get minDetectInterval(): number {
    return this._minDetectInterval;
  }

  get verificationThreshold(): number {
    return this._verificationThreshold;
  }

  get useVerification(): boolean {
    return this._useVerification;
  }

  get bufferSize(): number {
    return this._bufferSize;
  }

  get bestKeyword(): string {
    return this._bestKeyword;
  }

  get bestConfidence(): number {
    return this._bestConfidence;
  }

  get isDetected(): boolean {
    return this._isDetected;
  }

  get latency(): number {
    return this._latency;
  }

  setModelType(type: string): void {
    const validTypes = ['cnn', 'rnn', 'dnn', 'gru', 'lstm', 'transformer'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid wake word model type: ${type}`);
    }
    this._modelType = type;
  }

  setSampleRate(rate: number): void {
    this._sampleRate = rate;
  }

  setWindowSize(size: number): void {
    this._windowSize = size;
  }

  setHopSize(size: number): void {
    this._hopSize = size;
  }

  setFeatureType(type: string): void {
    this._featureType = type;
  }

  setThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be in [0, 1]');
    }
    this._threshold = threshold;
    for (const model of this._keywordModels.values()) {
      model.threshold = threshold;
    }
  }

  setKeywords(keywords: string[]): void {
    this._keywords = [...keywords];
    this._keywordModels.clear();
    for (const kw of keywords) {
      this._keywordModels.set(kw, {
        name: kw,
        keywords: [kw],
        threshold: this._threshold,
        modelType: this._modelType,
        sampleRate: this._sampleRate,
        windowSize: this._windowSize,
        hopSize: this._hopSize,
        featureType: this._featureType,
        embeddingDim: this._embeddingDim
      });
    }
  }

  addKeyword(keyword: string): void {
    if (!this._keywords.includes(keyword)) {
      this._keywords.push(keyword);
      this._keywordModels.set(keyword, {
        name: keyword,
        keywords: [keyword],
        threshold: this._threshold,
        modelType: this._modelType,
        sampleRate: this._sampleRate,
        windowSize: this._windowSize,
        hopSize: this._hopSize,
        featureType: this._featureType,
        embeddingDim: this._embeddingDim
      });
    }
  }

  removeKeyword(keyword: string): boolean {
    const idx = this._keywords.indexOf(keyword);
    if (idx >= 0) {
      this._keywords.splice(idx, 1);
      this._keywordModels.delete(keyword);
      return true;
    }
    return false;
  }

  setMinDetectInterval(ms: number): void {
    this._minDetectInterval = ms;
  }

  setVerificationThreshold(threshold: number): void {
    this._verificationThreshold = threshold;
  }

  setUseVerification(use: boolean): void {
    this._useVerification = use;
  }

  setBufferSize(size: number): void {
    this._bufferSize = size;
    if (this._buffer.length > size) {
      this._buffer = this._buffer.slice(this._buffer.length - size);
    }
  }

  startListening(): void {
    this._isListening = true;
    this._buffer = [];
  }

  stopListening(): void {
    this._isListening = false;
  }

  resetBuffer(): void {
    this._buffer = [];
  }

  feedAudio(audio: number[]): void {
    this._buffer.push(...audio);
    if (this._buffer.length > this._bufferSize) {
      this._buffer = this._buffer.slice(this._buffer.length - this._bufferSize);
    }
    this._totalAudioDuration += audio.length / this._sampleRate;
  }

  extractFeatures(audio: number[]): number[][] {
    const numFrames = Math.floor((audio.length - this._windowSize) / this._hopSize) + 1;
    const features: number[][] = [];
    const numCoeffs = 13;
    for (let f = 0; f < numFrames; f++) {
      const start = f * this._hopSize;
      const frame = audio.slice(start, start + this._windowSize);
      const windowed = this._applyWindow(frame);
      const spectrum = this._powerSpectrum(windowed);
      const mfcc = this._computeMFCC(spectrum, numCoeffs);
      features.push(mfcc);
    }
    return features;
  }

  private _applyWindow(frame: number[]): number[] {
    const result = new Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      result[i] = frame[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1)));
    }
    return result;
  }

  private _powerSpectrum(frame: number[]): number[] {
    const n = frame.length;
    const spectrum = new Array(n / 2 + 1);
    for (let k = 0; k <= n / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = (-2 * Math.PI * k * t) / n;
        real += frame[t] * Math.cos(angle);
        imag += frame[t] * Math.sin(angle);
      }
      spectrum[k] = (real * real + imag * imag) / n;
    }
    return spectrum;
  }

  private _computeMFCC(spectrum: number[], numCoeffs: number): number[] {
    const numFilters = 26;
    const melSpectrum = new Array(numFilters).fill(0);
    for (let m = 0; m < numFilters; m++) {
      const freq = (m + 1) * (this._sampleRate / 2) / (numFilters + 1);
      const bin = Math.floor(freq * spectrum.length * 2 / this._sampleRate);
      for (let j = Math.max(0, bin - 2); j < Math.min(spectrum.length, bin + 3); j++) {
        melSpectrum[m] += spectrum[j] * Math.exp(-Math.pow(j - bin, 2) / 2);
      }
    }
    const logMel = melSpectrum.map(v => Math.log(Math.max(v, 1e-10)));
    const mfcc = new Array(numCoeffs);
    for (let c = 0; c < numCoeffs; c++) {
      let sum = 0;
      for (let m = 0; m < numFilters; m++) {
        sum += logMel[m] * Math.cos((Math.PI * c * (2 * m + 1)) / (2 * numFilters));
      }
      mfcc[c] = sum * 2;
    }
    return mfcc;
  }

  computeEmbedding(features: number[][]): number[] {
    const embedding = new Array(this._embeddingDim).fill(0);
    if (features.length === 0) {
      return embedding;
    }
    for (let i = 0; i < this._embeddingDim; i++) {
      let sum = 0;
      for (let f = 0; f < features.length; f++) {
        const feat = features[f];
        for (let d = 0; d < feat.length; d++) {
          sum += feat[d] * Math.sin((i + f + d) * 0.01);
        }
      }
      embedding[i] = sum / (features.length * Math.max(featDim(features), 1));
    }
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < this._embeddingDim; i++) {
        embedding[i] /= norm;
      }
    }
    return embedding;
  }

  private _keywordEmbedding(keyword: string): number[] {
    const embedding = new Array(this._embeddingDim);
    for (let i = 0; i < this._embeddingDim; i++) {
      let hash = 0;
      for (let j = 0; j < keyword.length; j++) {
        hash = ((hash << 5) - hash) + keyword.charCodeAt(j);
        hash |= 0;
      }
      embedding[i] = Math.sin(hash * (i + 1) * 0.001) * 0.5 + Math.cos(hash * (i + 1) * 0.002) * 0.3;
    }
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < this._embeddingDim; i++) {
        embedding[i] /= norm;
      }
    }
    return embedding;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions do not match');
    }
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0) return 0;
    return dot / (normA * normB);
  }

  spotKeyword(audio: number[], keyword: string): KeywordSpottingResult {
    const features = this.extractFeatures(audio);
    const embedding = this.computeEmbedding(features);
    const keywordEmb = this._keywordEmbedding(keyword);
    const score = this.cosineSimilarity(embedding, keywordEmb);
    const confidence = (score + 1) / 2;
    const detected = confidence >= this._threshold;
    return {
      keyword,
      detected,
      confidence,
      score,
      threshold: this._threshold,
      startTime: 0,
      endTime: audio.length / this._sampleRate,
      startFrame: 0,
      endFrame: Math.floor(audio.length / this._hopSize),
      frameIndex: 0
    };
  }

  spotAllKeywords(audio: number[]): KeywordSpottingResult[] {
    const results: KeywordSpottingResult[] = [];
    for (const keyword of this._keywords) {
      const result = this.spotKeyword(audio, keyword);
      results.push(result);
    }
    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  detect(audio: number[]): DetectionEvent[] {
    const startTime = Date.now();
    const events: DetectionEvent[] = [];
    const results = this.spotAllKeywords(audio);
    this._spotResults = results;
    let bestConfidence = 0;
    let bestKeyword = '';
    let detected = false;
    for (const result of results) {
      if (result.confidence > bestConfidence) {
        bestConfidence = result.confidence;
        bestKeyword = result.keyword;
      }
      if (result.detected) {
        const now = Date.now();
        if (now - this._lastDetectionTime < this._minDetectInterval) {
          continue;
        }
        let isVerified = true;
        if (this._useVerification) {
          isVerified = result.confidence >= this._verificationThreshold;
        }
        const event: DetectionEvent = {
          id: `detection-${Date.now()}-${this._detectionCount}`,
          keyword: result.keyword,
          confidence: result.confidence,
          score: result.score,
          timestamp: Date.now(),
          duration: audio.length / this._sampleRate,
          sampleRate: this._sampleRate,
          isVerified
        };
        events.push(event);
        this._detections.push(event);
        this._detectionCount++;
        this._lastDetectionTime = now;
        detected = true;
        if (this._useVerification && !isVerified) {
          this._falseAlarmCount++;
        }
      }
    }
    this._bestKeyword = bestKeyword;
    this._bestConfidence = bestConfidence;
    this._isDetected = detected;
    this._latency = Date.now() - startTime;
    return events;
  }

  continuousDetect(audioChunk: number[]): DetectionEvent[] {
    this.feedAudio(audioChunk);
    const windowSamples = Math.floor(1.0 * this._sampleRate);
    const stepSamples = Math.floor(0.1 * this._sampleRate);
    const events: DetectionEvent[] = [];
    if (this._buffer.length >= windowSamples) {
      for (let start = 0; start + windowSamples <= this._buffer.length; start += stepSamples) {
        const window = this._buffer.slice(start, start + windowSamples);
        const detections = this.detect(window);
        events.push(...detections);
        if (detections.length > 0) {
          this._buffer = [];
          break;
        }
      }
    }
    return events;
  }

  smoothScores(scores: number[], windowSize: number = 5): number[] {
    const smoothed: number[] = [];
    for (let i = 0; i < scores.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - Math.floor(windowSize / 2)); j <= Math.min(scores.length - 1, i + Math.floor(windowSize / 2)); j++) {
        sum += scores[j];
        count++;
      }
      smoothed.push(sum / count);
    }
    return smoothed;
  }

  computeConfidenceMetrics(): ConfidenceMetrics {
    if (this._spotResults.length === 0) {
      return {
        averageConfidence: 0,
        maxConfidence: 0,
        minConfidence: 0,
        stdDevConfidence: 0,
        falseAlarmRate: 0,
        missRate: 0,
        detectionRate: 0
      };
    }
    const confidences = this._spotResults.map(r => r.confidence);
    const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const max = Math.max(...confidences);
    const min = Math.min(...confidences);
    const variance = confidences.reduce((s, v) => s + (v - avg) * (v - avg), 0) / confidences.length;
    const stdDev = Math.sqrt(variance);
    const detectedCount = this._spotResults.filter(r => r.detected).length;
    const detectionRate = detectedCount / confidences.length;
    const falseAlarmRate = this._falseAlarmCount / Math.max(this._detectionCount, 1);
    const missRate = 1 - detectionRate;
    return {
      averageConfidence: avg,
      maxConfidence: max,
      minConfidence: min,
      stdDevConfidence: stdDev,
      falseAlarmRate,
      missRate,
      detectionRate
    };
  }

  evaluate(testSet: { audio: number[]; isPositive: boolean; keyword: string }[]): { accuracy: number; precision: number; recall: number; f1: number; eer: number } {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;
    const scores: { score: number; isPositive: boolean }[] = [];
    for (const sample of testSet) {
      const result = this.spotKeyword(sample.audio, sample.keyword);
      scores.push({ score: result.confidence, isPositive: sample.isPositive });
      if (sample.isPositive && result.detected) {
        tp++;
      } else if (sample.isPositive && !result.detected) {
        fn++;
      } else if (!sample.isPositive && result.detected) {
        fp++;
      } else {
        tn++;
      }
    }
    const accuracy = (tp + tn) / Math.max(testSet.length, 1);
    const precision = tp / Math.max(tp + fp, 1);
    const recall = tp / Math.max(tp + fn, 1);
    const f1 = 2 * (precision * recall) / Math.max(precision + recall, 1e-10);
    const eer = this._computeEER(scores);
    return { accuracy, precision, recall, f1, eer };
  }

  private _computeEER(scores: { score: number; isPositive: boolean }[]): number {
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const numPositive = scores.filter(s => s.isPositive).length;
    const numNegative = scores.filter(s => !s.isPositive).length;
    let tp = 0;
    let fp = 0;
    let eer = 0.5;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].isPositive) {
        tp++;
      } else {
        fp++;
      }
      const far = fp / Math.max(numNegative, 1);
      const frr = (numPositive - tp) / Math.max(numPositive, 1);
      if (Math.abs(far - frr) < Math.abs(eer - (1 - tp / numPositive))) {
        eer = (far + frr) / 2;
      }
    }
    return eer;
  }

  process(audio: number[], sampleRate?: number): WakeWordResult {
    const startTime = Date.now();
    if (sampleRate) {
      this._sampleRate = sampleRate;
    }
    const detections = this.detect(audio);
    const metrics = this.computeConfidenceMetrics();
    this._latency = Date.now() - startTime;
    const result: WakeWordResult = {
      model: {
        name: 'wake-word-model',
        keywords: this._keywords,
        threshold: this._threshold,
        modelType: this._modelType,
        sampleRate: this._sampleRate,
        windowSize: this._windowSize,
        hopSize: this._hopSize,
        featureType: this._featureType,
        embeddingDim: this._embeddingDim
      },
      detections,
      spotResults: this._spotResults,
      state: {
        isListening: this._isListening,
        currentKeyword: this._bestKeyword,
        buffer: [...this._buffer],
        bufferSize: this._bufferSize,
        lastDetectionTime: this._lastDetectionTime,
        detectionCount: this._detectionCount,
        falseAlarmCount: this._falseAlarmCount,
        totalAudioDuration: this._totalAudioDuration
      },
      metrics,
      keywords: this._keywords,
      numKeywords: this._keywords.length,
      threshold: this._threshold,
      detectionCount: this._detectionCount,
      isDetected: this._isDetected,
      bestKeyword: this._bestKeyword,
      bestConfidence: this._bestConfidence,
      latency: this._latency
    };
    this._lastResult = result;
    return result;
  }

  toPacket(): DataPacket<WakeWordResult> {
    const result = this._lastResult || {
      model: {
        name: 'wake-word-model',
        keywords: this._keywords,
        threshold: this._threshold,
        modelType: this._modelType,
        sampleRate: this._sampleRate,
        windowSize: this._windowSize,
        hopSize: this._hopSize,
        featureType: this._featureType,
        embeddingDim: this._embeddingDim
      },
      detections: this._detections,
      spotResults: this._spotResults,
      state: {
        isListening: this._isListening,
        currentKeyword: this._bestKeyword,
        buffer: [...this._buffer],
        bufferSize: this._bufferSize,
        lastDetectionTime: this._lastDetectionTime,
        detectionCount: this._detectionCount,
        falseAlarmCount: this._falseAlarmCount,
        totalAudioDuration: this._totalAudioDuration
      },
      metrics: this.computeConfidenceMetrics(),
      keywords: this._keywords,
      numKeywords: this._keywords.length,
      threshold: this._threshold,
      detectionCount: this._detectionCount,
      isDetected: this._isDetected,
      bestKeyword: this._bestKeyword,
      bestConfidence: this._bestConfidence,
      latency: this._latency
    };
    this._counter++;
    return {
      id: `wake-word-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech_recognition', 'wake_word'],
        priority: 1,
        phase: 'keyword_spotting'
      }
    };
  }

  reset(): void {
    this._modelType = 'cnn';
    this._sampleRate = 16000;
    this._windowSize = 512;
    this._hopSize = 256;
    this._featureType = 'mfcc';
    this._embeddingDim = 128;
    this._threshold = 0.8;
    this._keywords = ['hey trae', 'ok trae', 'wake up'];
    this._keywordModels.clear();
    this._detections = [];
    this._spotResults = [];
    this._buffer = [];
    this._bufferSize = 16000;
    this._isListening = false;
    this._lastDetectionTime = 0;
    this._detectionCount = 0;
    this._falseAlarmCount = 0;
    this._totalAudioDuration = 0;
    this._minDetectInterval = 1000;
    this._verificationThreshold = 0.85;
    this._useVerification = true;
    this._smoothingWindow = 5;
    this._smoothedScores = [];
    this._counter = 0;
    this._lastResult = null;
    this._latency = 0;
    this._bestKeyword = '';
    this._bestConfidence = 0;
    this._isDetected = false;
    this._initKeywordModels();
  }
}

function featDim(features: number[][]): number {
  return features.length > 0 ? features[0].length : 1;
}
