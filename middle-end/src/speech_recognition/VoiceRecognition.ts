import { DataPacket } from '../shared/types';
import { Audio } from './AudioProcessing';

export interface VerificationResult {
  match: boolean;
  score: number;
  threshold: number;
}

export interface Voiceprint {
  id: string;
  embedding: number[];
  speaker: string;
  confidence: number;
}

export class VoiceRecognition {
  private _voiceprints: Voiceprint[] = [];
  private _database: Map<string, number[]> = new Map();
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _lastResult: VerificationResult | null = null;

  get voiceprints(): Voiceprint[] {
    return this._voiceprints;
  }

  get database(): Map<string, number[]> {
    return this._database;
  }

  get modelType(): string {
    return this._modelType;
  }

  enroll(audio: Audio, speakerId: string): Voiceprint {
    const embedding = this.extractVoiceprint(audio, { name: 'enroll' });
    this._database.set(speakerId, embedding);
    const vp: Voiceprint = {
      id: speakerId,
      embedding,
      speaker: speakerId,
      confidence: 0.95
    };
    this._voiceprints.push(vp);
    return vp;
  }

  verify(audio: Audio, speakerId: string, threshold: number = 0.7): VerificationResult {
    const embedding = this.extractVoiceprint(audio, { name: 'verify' });
    const stored = this._database.get(speakerId);
    let score = 0;
    if (stored) {
      score = this._cosineSimilarity(embedding, stored);
    }
    const result: VerificationResult = {
      match: score > threshold,
      score,
      threshold
    };
    this._lastResult = result;
    return result;
  }

  identify(audio: Audio, database: Map<string, number[]>, topN: number = 5): { speaker: string; score: number }[] {
    const embedding = this.extractVoiceprint(audio, { name: 'identify' });
    const results: { speaker: string; score: number }[] = [];
    for (const [speaker, vp] of database) {
      const score = this._cosineSimilarity(embedding, vp);
      results.push({ speaker, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topN);
  }

  extractVoiceprint(audio: Audio, model: { name: string }): number[] {
    const embedding = new Array(256).fill(0);
    let seed = this._hash(model.name + audio.sampleRate + audio.duration);
    for (let i = 0; i < 256; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      embedding[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0)) || 1;
    return embedding.map(v => v / norm);
  }

  voiceprintDistance(vp1: number[], vp2: number[], metric: string = 'cosine'): number {
    if (metric === 'cosine') {
      return 1 - this._cosineSimilarity(vp1, vp2);
    } else if (metric === 'euclidean') {
      return this._euclideanDistance(vp1, vp2);
    }
    return this._cosineSimilarity(vp1, vp2);
  }

  speakerEmbedding(audio: Audio, model: { name: string }): number[] {
    return this.extractVoiceprint(audio, model);
  }

  speakerVerification(audio1: Audio, audio2: Audio, threshold: number): VerificationResult {
    const e1 = this.extractVoiceprint(audio1, { name: 'verify1' });
    const e2 = this.extractVoiceprint(audio2, { name: 'verify2' });
    const score = this._cosineSimilarity(e1, e2);
    return {
      match: score > threshold,
      score,
      threshold
    };
  }

  antiSpoofing(audio: Audio): boolean {
    let energy = 0;
    let highFreqEnergy = 0;
    const n = audio.samples.length;
    for (let i = 0; i < n; i++) {
      energy += audio.samples[i] * audio.samples[i];
    }
    const fftSize = 1024;
    for (let i = fftSize / 2; i < fftSize && i < n; i++) {
      highFreqEnergy += audio.samples[i] * audio.samples[i];
    }
    const ratio = energy > 0 ? highFreqEnergy / energy : 0;
    return ratio < 0.3;
  }

  livenessDetection(audio: Audio): boolean {
    let zcr = 0;
    for (let i = 1; i < audio.samples.length; i++) {
      if ((audio.samples[i] >= 0 && audio.samples[i - 1] < 0) ||
          (audio.samples[i] < 0 && audio.samples[i - 1] >= 0)) {
        zcr++;
      }
    }
    const zcrRate = zcr / audio.samples.length;
    return zcrRate > 0.05 && zcrRate < 0.5;
  }

  cohortNormalization(score: number, cohort: number[]): number {
    if (cohort.length === 0) return score;
    const mean = cohort.reduce((a, b) => a + b, 0) / cohort.length;
    const std = Math.sqrt(cohort.reduce((a, b) => a + (b - mean) ** 2, 0) / cohort.length) || 1;
    return (score - mean) / std;
  }

  scoreNormalization(scores: number[]): number[] {
    if (scores.length === 0) return [];
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;
    return scores.map(s => (s - min) / range);
  }

  private _cosineSimilarity(v1: number[], v2: number[]): number {
    let dot = 0;
    let n1 = 0;
    let n2 = 0;
    const minLen = Math.min(v1.length, v2.length);
    for (let i = 0; i < minLen; i++) {
      dot += v1[i] * v2[i];
      n1 += v1[i] * v1[i];
      n2 += v2[i] * v2[i];
    }
    const denom = Math.sqrt(n1) * Math.sqrt(n2);
    return denom === 0 ? 0 : dot / denom;
  }

  private _euclideanDistance(v1: number[], v2: number[]): number {
    let sum = 0;
    const minLen = Math.min(v1.length, v2.length);
    for (let i = 0; i < minLen; i++) {
      const d = v1[i] - v2[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
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

  toPacket(): DataPacket<VerificationResult> {
    const result = this._lastResult || { match: false, score: 0, threshold: 0 };
    this._counter++;
    return {
      id: `voice-rec-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech', 'voice-recognition'],
        priority: 1,
        phase: 'voice-recognition'
      }
    };
  }

  reset(): void {
    this._voiceprints = [];
    this._database.clear();
    this._counter = 0;
    this._modelType = 'default';
    this._lastResult = null;
  }
}
