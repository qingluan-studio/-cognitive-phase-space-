import { DataPacket } from '../shared/types';

export interface SpeakerProfile {
  id: string;
  name: string;
  embedding: number[];
  embeddingDim: number;
  sampleCount: number;
  createdAt: number;
  updatedAt: number;
  metadata: Map<string, string>;
}

export interface VoiceprintFeature {
  mfcc: number[];
  delta: number[];
  deltaDelta: number[];
  pitch: number;
  formants: number[];
  energy: number;
}

export interface VerificationResult {
  isVerified: boolean;
  confidence: number;
  score: number;
  threshold: number;
  targetSpeakerId: string;
  targetSpeakerName: string;
  duration: number;
  sampleRate: number;
}

export interface IdentificationResult {
  speakerId: string;
  speakerName: string;
  confidence: number;
  score: number;
  rank: number;
  candidates: { speakerId: string; speakerName: string; score: number; confidence: number }[];
  totalSpeakers: number;
}

export interface SpeakerSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  startTime: number;
  endTime: number;
  duration: number;
  startFrame: number;
  endFrame: number;
  confidence: number;
}

export interface DiarizationResult {
  segments: SpeakerSegment[];
  numSpeakers: number;
  totalDuration: number;
  speakerStats: Map<string, { totalDuration: number; segmentCount: number; percentage: number }>;
}

export interface EmbeddingExtractorConfig {
  modelType: string;
  embeddingDim: number;
  frameSize: number;
  hopSize: number;
  fftSize: number;
  sampleRate: number;
}

export interface SpeakerRecognitionResult {
  method: string;
  voiceprints: VoiceprintFeature[];
  embedding: number[];
  embeddingDim: number;
  verification: VerificationResult | null;
  identification: IdentificationResult | null;
  diarization: DiarizationResult | null;
  speakerProfiles: SpeakerProfile[];
  numProfiles: number;
  sampleRate: number;
  duration: number;
  latency: number;
}

export class SpeakerRecognition {
  private _method: string = 'x-vector';
  private _sampleRate: number = 16000;
  private _embeddingDim: number = 256;
  private _frameSize: number = 512;
  private _hopSize: number = 256;
  private _fftSize: number = 512;
  private _verificationThreshold: number = 0.7;
  private _speakerProfiles: Map<string, SpeakerProfile> = new Map();
  private _voiceprints: VoiceprintFeature[] = [];
  private _currentEmbedding: number[] = [];
  private _verificationResult: VerificationResult | null = null;
  private _identificationResult: IdentificationResult | null = null;
  private _diarizationResult: DiarizationResult | null = null;
  private _duration: number = 0;
  private _latency: number = 0;
  private _counter: number = 0;
  private _lastResult: SpeakerRecognitionResult | null = null;
  private _numMfcc: number = 13;
  private _usePitch: boolean = true;
  private _useFormants: boolean = true;
  private _diarizationMethod: string = 'hmm';
  private _maxSpeakers: number = 10;

  constructor() {
    this._initDefaultProfiles();
  }

  private _initDefaultProfiles(): void {
    const defaultSpeakers = [
      { id: 'spk_001', name: 'speaker_1' },
      { id: 'spk_002', name: 'speaker_2' },
      { id: 'spk_003', name: 'speaker_3' }
    ];
    for (const spk of defaultSpeakers) {
      const embedding = new Array(this._embeddingDim);
      for (let i = 0; i < this._embeddingDim; i++) {
        embedding[i] = (Math.sin(i * 0.1 + spk.id.length) + Math.cos(i * 0.05)) * 0.3;
      }
      this._speakerProfiles.set(spk.id, {
        id: spk.id,
        name: spk.name,
        embedding,
        embeddingDim: this._embeddingDim,
        sampleCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: new Map()
      });
    }
  }

  get method(): string {
    return this._method;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  get embeddingDim(): number {
    return this._embeddingDim;
  }

  get verificationThreshold(): number {
    return this._verificationThreshold;
  }

  get numProfiles(): number {
    return this._speakerProfiles.size;
  }

  get speakerProfiles(): SpeakerProfile[] {
    return Array.from(this._speakerProfiles.values());
  }

  get voiceprints(): VoiceprintFeature[] {
    return [...this._voiceprints];
  }

  get currentEmbedding(): number[] {
    return [...this._currentEmbedding];
  }

  get duration(): number {
    return this._duration;
  }

  get latency(): number {
    return this._latency;
  }

  get diarizationMethod(): string {
    return this._diarizationMethod;
  }

  get maxSpeakers(): number {
    return this._maxSpeakers;
  }

  setMethod(method: string): void {
    const validMethods = ['mfcc-gmm', 'i-vector', 'x-vector', 'd-vector', 'ecapa'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid speaker recognition method: ${method}`);
    }
    this._method = method;
  }

  setSampleRate(rate: number): void {
    this._sampleRate = rate;
  }

  setEmbeddingDim(dim: number): void {
    this._embeddingDim = dim;
  }

  setVerificationThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be in [0, 1]');
    }
    this._verificationThreshold = threshold;
  }

  setDiarizationMethod(method: string): void {
    const validMethods = ['hmm', 'ahc', 'vb-hmm', 'spectral'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid diarization method: ${method}`);
    }
    this._diarizationMethod = method;
  }

  setMaxSpeakers(n: number): void {
    this._maxSpeakers = n;
  }

  addSpeakerProfile(id: string, name: string, embedding?: number[]): SpeakerProfile {
    const emb = embedding || this._generateRandomEmbedding();
    const profile: SpeakerProfile = {
      id,
      name,
      embedding: emb,
      embeddingDim: this._embeddingDim,
      sampleCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: new Map()
    };
    this._speakerProfiles.set(id, profile);
    return profile;
  }

  getSpeakerProfile(id: string): SpeakerProfile | undefined {
    return this._speakerProfiles.get(id);
  }

  removeSpeakerProfile(id: string): boolean {
    return this._speakerProfiles.delete(id);
  }

  updateSpeakerProfile(id: string, newEmbedding: number[]): SpeakerProfile | null {
    const profile = this._speakerProfiles.get(id);
    if (!profile) {
      return null;
    }
    const updated = {
      ...profile,
      embedding: this._averageEmbeddings([profile.embedding, newEmbedding]),
      sampleCount: profile.sampleCount + 1,
      updatedAt: Date.now()
    };
    this._speakerProfiles.set(id, updated);
    return updated;
  }

  private _generateRandomEmbedding(): number[] {
    const emb = new Array(this._embeddingDim);
    for (let i = 0; i < this._embeddingDim; i++) {
      emb[i] = Math.random() * 2 - 1;
    }
    const norm = this._vectorNorm(emb);
    if (norm > 0) {
      for (let i = 0; i < this._embeddingDim; i++) {
        emb[i] /= norm;
      }
    }
    return emb;
  }

  private _averageEmbeddings(embeddings: number[][]): number[] {
    const avg = new Array(this._embeddingDim).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < this._embeddingDim; i++) {
        avg[i] += emb[i];
      }
    }
    for (let i = 0; i < this._embeddingDim; i++) {
      avg[i] /= embeddings.length;
    }
    return avg;
  }

  private _vectorNorm(v: number[]): number {
    let sum = 0;
    for (const x of v) {
      sum += x * x;
    }
    return Math.sqrt(sum);
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

  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions do not match');
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  extractMFCC(audio: number[]): VoiceprintFeature[] {
    const features: VoiceprintFeature[] = [];
    const numFrames = Math.floor((audio.length - this._frameSize) / this._hopSize) + 1;
    for (let f = 0; f < numFrames; f++) {
      const start = f * this._hopSize;
      const frame = audio.slice(start, start + this._frameSize);
      const mfcc = new Array(this._numMfcc);
      for (let i = 0; i < this._numMfcc; i++) {
        mfcc[i] = Math.sin(i * 0.2 + f * 0.05) * 0.5 + Math.cos(i * 0.1) * 0.3;
      }
      const delta = new Array(this._numMfcc);
      const deltaDelta = new Array(this._numMfcc);
      for (let i = 0; i < this._numMfcc; i++) {
        delta[i] = Math.sin(i * 0.3 + f * 0.07) * 0.3;
        deltaDelta[i] = Math.sin(i * 0.25 + f * 0.06) * 0.2;
      }
      let energy = 0;
      for (const s of frame) {
        energy += s * s;
      }
      energy = Math.sqrt(energy / frame.length);
      const pitch = this._usePitch ? 80 + Math.abs(Math.sin(f * 0.1)) * 300 : 0;
      const formants = this._useFormants ? [500 + f * 5, 1500 + f * 10, 2500 + f * 8] : [];
      features.push({
        mfcc,
        delta,
        deltaDelta,
        pitch,
        formants,
        energy
      });
    }
    return features;
  }

  extractEmbedding(audio: number[]): number[] {
    const voiceprints = this.extractMFCC(audio);
    this._voiceprints = voiceprints;
    const embedding = new Array(this._embeddingDim).fill(0);
    if (voiceprints.length === 0) {
      this._currentEmbedding = embedding;
      return embedding;
    }
    switch (this._method) {
      case 'mfcc-gmm':
      case 'i-vector':
        for (let i = 0; i < this._embeddingDim; i++) {
          const mfccIdx = i % this._numMfcc;
          let sum = 0;
          for (const vp of voiceprints) {
            if (i < this._numMfcc) {
              sum += vp.mfcc[mfccIdx];
            } else if (i < 2 * this._numMfcc) {
              sum += vp.delta[mfccIdx];
            } else {
              sum += vp.deltaDelta[mfccIdx];
            }
          }
          embedding[i] = sum / voiceprints.length;
        }
        break;
      case 'x-vector':
      case 'd-vector':
      case 'ecapa':
      default:
        for (let i = 0; i < this._embeddingDim; i++) {
          let val = 0;
          for (const vp of voiceprints) {
            for (let j = 0; j < vp.mfcc.length; j++) {
              val += vp.mfcc[j] * Math.sin((i + j) * 0.01);
              val += vp.delta[j] * Math.cos((i + j) * 0.02) * 0.5;
            }
            val += vp.energy * 0.1;
          }
          embedding[i] = val / voiceprints.length;
        }
    }
    const norm = this._vectorNorm(embedding);
    if (norm > 0) {
      for (let i = 0; i < this._embeddingDim; i++) {
        embedding[i] /= norm;
      }
    }
    this._currentEmbedding = embedding;
    return embedding;
  }

  verify(audio: number[], targetSpeakerId: string): VerificationResult {
    const startTime = Date.now();
    const targetProfile = this._speakerProfiles.get(targetSpeakerId);
    if (!targetProfile) {
      return {
        isVerified: false,
        confidence: 0,
        score: 0,
        threshold: this._verificationThreshold,
        targetSpeakerId,
        targetSpeakerName: 'unknown',
        duration: 0,
        sampleRate: this._sampleRate
      };
    }
    const embedding = this.extractEmbedding(audio);
    this._duration = audio.length / this._sampleRate;
    const score = this.cosineSimilarity(embedding, targetProfile.embedding);
    const normalizedScore = (score + 1) / 2;
    const isVerified = normalizedScore >= this._verificationThreshold;
    const confidence = isVerified
      ? (normalizedScore - this._verificationThreshold) / (1 - this._verificationThreshold)
      : (this._verificationThreshold - normalizedScore) / this._verificationThreshold;
    const result: VerificationResult = {
      isVerified,
      confidence: Math.max(0, Math.min(1, Math.abs(confidence))),
      score: normalizedScore,
      threshold: this._verificationThreshold,
      targetSpeakerId,
      targetSpeakerName: targetProfile.name,
      duration: this._duration,
      sampleRate: this._sampleRate
    };
    this._verificationResult = result;
    this._latency = Date.now() - startTime;
    return result;
  }

  identify(audio: number[], topK: number = 5): IdentificationResult {
    const startTime = Date.now();
    const embedding = this.extractEmbedding(audio);
    this._duration = audio.length / this._sampleRate;
    const candidates: { speakerId: string; speakerName: string; score: number; confidence: number }[] = [];
    for (const profile of this._speakerProfiles.values()) {
      const cosScore = this.cosineSimilarity(embedding, profile.embedding);
      const normalizedScore = (cosScore + 1) / 2;
      candidates.push({
        speakerId: profile.id,
        speakerName: profile.name,
        score: normalizedScore,
        confidence: 0
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, topK);
    let totalScore = 0;
    for (const c of topCandidates) {
      totalScore += c.score;
    }
    for (let i = 0; i < topCandidates.length; i++) {
      topCandidates[i].confidence = totalScore > 0 ? topCandidates[i].score / totalScore : 0;
      topCandidates[i] = { ...topCandidates[i] };
    }
    const result: IdentificationResult = {
      speakerId: topCandidates[0]?.speakerId || '',
      speakerName: topCandidates[0]?.speakerName || '',
      confidence: topCandidates[0]?.confidence || 0,
      score: topCandidates[0]?.score || 0,
      rank: 1,
      candidates: topCandidates,
      totalSpeakers: this._speakerProfiles.size
    };
    this._identificationResult = result;
    this._latency = Date.now() - startTime;
    return result;
  }

  diarize(audio: number[], numSpeakers?: number): DiarizationResult {
    const startTime = Date.now();
    this._duration = audio.length / this._sampleRate;
    const frameSize = this._frameSize;
    const hopSize = this._hopSize;
    const numFrames = Math.floor((audio.length - frameSize) / hopSize) + 1;
    const nSpeakers = numSpeakers || Math.min(3, this._speakerProfiles.size);
    const speakerIds = Array.from(this._speakerProfiles.keys()).slice(0, nSpeakers);
    const speakerNames = Array.from(this._speakerProfiles.values()).slice(0, nSpeakers).map(p => p.name);
    const segments: SpeakerSegment[] = [];
    const segmentDur = this._duration / Math.max(numFrames / 50, 1);
    const numSegments = Math.ceil(this._duration / segmentDur);
    let currentSpeaker = 0;
    let segmentStart = 0;
    for (let i = 0; i < numSegments; i++) {
      if (Math.random() < 0.2 && i > 0) {
        const endTime = i * segmentDur;
        segments.push({
          id: `seg-${segments.length}`,
          speakerId: speakerIds[currentSpeaker],
          speakerName: speakerNames[currentSpeaker],
          startTime: segmentStart,
          endTime,
          duration: endTime - segmentStart,
          startFrame: Math.floor(segmentStart * this._sampleRate / hopSize),
          endFrame: Math.floor(endTime * this._sampleRate / hopSize),
          confidence: 0.6 + Math.random() * 0.3
        });
        currentSpeaker = (currentSpeaker + 1) % nSpeakers;
        segmentStart = endTime;
      }
    }
    if (segmentStart < this._duration) {
      segments.push({
        id: `seg-${segments.length}`,
        speakerId: speakerIds[currentSpeaker],
        speakerName: speakerNames[currentSpeaker],
        startTime: segmentStart,
        endTime: this._duration,
        duration: this._duration - segmentStart,
        startFrame: Math.floor(segmentStart * this._sampleRate / hopSize),
        endFrame: numFrames - 1,
        confidence: 0.6 + Math.random() * 0.3
      });
    }
    const speakerStats = new Map<string, { totalDuration: number; segmentCount: number; percentage: number }>();
    for (const seg of segments) {
      const existing = speakerStats.get(seg.speakerId) || { totalDuration: 0, segmentCount: 0, percentage: 0 };
      existing.totalDuration += seg.duration;
      existing.segmentCount++;
      speakerStats.set(seg.speakerId, existing);
    }
    for (const [spkId, stats] of speakerStats) {
      stats.percentage = this._duration > 0 ? stats.totalDuration / this._duration : 0;
    }
    const result: DiarizationResult = {
      segments,
      numSpeakers: nSpeakers,
      totalDuration: this._duration,
      speakerStats
    };
    this._diarizationResult = result;
    this._latency = Date.now() - startTime;
    return result;
  }

  enrollSpeaker(id: string, name: string, audioSamples: number[][]): SpeakerProfile {
    const embeddings: number[][] = [];
    for (const audio of audioSamples) {
      const emb = this.extractEmbedding(audio);
      embeddings.push(emb);
    }
    const avgEmbedding = this._averageEmbeddings(embeddings);
    const profile: SpeakerProfile = {
      id,
      name,
      embedding: avgEmbedding,
      embeddingDim: this._embeddingDim,
      sampleCount: audioSamples.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: new Map()
    };
    this._speakerProfiles.set(id, profile);
    return profile;
  }

  computeEER(scores: { score: number; isTarget: boolean }[]): number {
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    let far = 1;
    let frr = 0;
    const numTarget = scores.filter(s => s.isTarget).length;
    const numNonTarget = scores.filter(s => !s.isTarget).length;
    let tp = 0;
    let fp = 0;
    let eer = 0.5;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].isTarget) {
        tp++;
      } else {
        fp++;
      }
      frr = (numTarget - tp) / Math.max(numTarget, 1);
      far = fp / Math.max(numNonTarget, 1);
      if (Math.abs(far - frr) < Math.abs(eer - (1 - frr))) {
        eer = (far + frr) / 2;
      }
    }
    return eer;
  }

  process(audio: number[], sampleRate?: number): SpeakerRecognitionResult {
    const startTime = Date.now();
    if (sampleRate) {
      this._sampleRate = sampleRate;
    }
    this._duration = audio.length / this._sampleRate;
    const embedding = this.extractEmbedding(audio);
    this._latency = Date.now() - startTime;
    const result: SpeakerRecognitionResult = {
      method: this._method,
      voiceprints: this._voiceprints,
      embedding,
      embeddingDim: this._embeddingDim,
      verification: this._verificationResult,
      identification: this._identificationResult,
      diarization: this._diarizationResult,
      speakerProfiles: Array.from(this._speakerProfiles.values()),
      numProfiles: this._speakerProfiles.size,
      sampleRate: this._sampleRate,
      duration: this._duration,
      latency: this._latency
    };
    this._lastResult = result;
    return result;
  }

  toPacket(): DataPacket<SpeakerRecognitionResult> {
    const result = this._lastResult || {
      method: this._method,
      voiceprints: this._voiceprints,
      embedding: this._currentEmbedding,
      embeddingDim: this._embeddingDim,
      verification: this._verificationResult,
      identification: this._identificationResult,
      diarization: this._diarizationResult,
      speakerProfiles: Array.from(this._speakerProfiles.values()),
      numProfiles: this._speakerProfiles.size,
      sampleRate: this._sampleRate,
      duration: this._duration,
      latency: this._latency
    };
    this._counter++;
    return {
      id: `speaker-recognition-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech_recognition', 'speaker_recognition'],
        priority: 1,
        phase: 'speaker_verification'
      }
    };
  }

  reset(): void {
    this._method = 'x-vector';
    this._sampleRate = 16000;
    this._embeddingDim = 256;
    this._frameSize = 512;
    this._hopSize = 256;
    this._fftSize = 512;
    this._verificationThreshold = 0.7;
    this._speakerProfiles.clear();
    this._voiceprints = [];
    this._currentEmbedding = [];
    this._verificationResult = null;
    this._identificationResult = null;
    this._diarizationResult = null;
    this._duration = 0;
    this._latency = 0;
    this._counter = 0;
    this._lastResult = null;
    this._numMfcc = 13;
    this._usePitch = true;
    this._useFormants = true;
    this._diarizationMethod = 'hmm';
    this._maxSpeakers = 10;
    this._initDefaultProfiles();
  }
}
