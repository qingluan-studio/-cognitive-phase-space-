import { DataPacket } from '../shared/types';
import { Audio } from './AudioProcessing';

export interface MusicFeature {
  name: string;
  value: number;
  unit: string;
}

export interface Music {
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  mode: string;
  instruments: string[];
}

export class MusicInformation {
  private _musicInfos: Music[] = [];
  private _features: MusicFeature[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _lastMusic: Music | null = null;

  get musicInfos(): Music[] {
    return this._musicInfos;
  }

  get features(): MusicFeature[] {
    return this._features;
  }

  get modelType(): string {
    return this._modelType;
  }

  genreClassification(audio: Audio, model: { name: string }): string {
    const genres = ['rock', 'pop', 'jazz', 'classical', 'hiphop', 'electronic', 'country', 'rnb', 'reggae', 'metal'];
    const seed = this._hash(model.name + audio.duration);
    return genres[seed % genres.length];
  }

  moodDetection(audio: Audio, model: { name: string }): string {
    const moods = ['happy', 'sad', 'energetic', 'calm', 'angry', 'romantic', 'melancholic', 'uplifting', 'mysterious', 'peaceful'];
    const rms = this._rms(audio.samples);
    const zcr = this._zcr(audio.samples);
    if (rms > 0.3 && zcr > 0.2) return 'energetic';
    if (rms < 0.1 && zcr < 0.1) return 'calm';
    const seed = this._hash('mood' + audio.duration);
    return moods[seed % moods.length];
  }

  tempoDetection(audio: Audio): number {
    return this.beatTracking(audio);
  }

  beatTracking(audio: Audio): number {
    const frameSize = Math.floor(audio.sampleRate * 0.05);
    const hopSize = Math.floor(audio.sampleRate * 0.01);
    const energies: number[] = [];
    for (let i = 0; i < audio.samples.length; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < frameSize && i + j < audio.samples.length; j++) {
        energy += Math.abs(audio.samples[i + j]);
      }
      energies.push(energy / frameSize);
    }
    let bestBpm = 120;
    let bestScore = 0;
    for (let bpm = 60; bpm <= 200; bpm += 1) {
      const beatInterval = 60 / bpm;
      const beatFrames = Math.floor(beatInterval / (hopSize / audio.sampleRate));
      let score = 0;
      for (let i = 0; i < energies.length; i++) {
        const beatIdx = (i % beatFrames);
        if (beatIdx === 0) {
          score += energies[i];
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestBpm = bpm;
      }
    }
    this._features.push({ name: 'bpm', value: bestBpm, unit: 'BPM' });
    return bestBpm;
  }

  onsetDetect(audio: Audio): number[] {
    const onsets: number[] = [];
    const frameSize = Math.floor(audio.sampleRate * 0.025);
    const hopSize = Math.floor(audio.sampleRate * 0.01);
    let prevEnergy = 0;
    for (let i = 0; i < audio.samples.length; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < frameSize && i + j < audio.samples.length; j++) {
        energy += audio.samples[i + j] * audio.samples[i + j];
      }
      if (prevEnergy > 0 && energy > prevEnergy * 1.3) {
        onsets.push(i / audio.sampleRate);
      }
      prevEnergy = energy;
    }
    return onsets;
  }

  keyEstimation(audio: Audio): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const seed = this._hash('key' + audio.duration);
    return keys[seed % keys.length];
  }

  chordRecognition(audio: Audio): string[] {
    const chords = ['C', 'G', 'Am', 'F', 'Dm', 'Em', 'D', 'A', 'E', 'Bm'];
    const result: string[] = [];
    const numChords = Math.floor(audio.duration / 4);
    for (let i = 0; i < numChords; i++) {
      const seed = this._hash('chord' + i + audio.duration);
      result.push(chords[seed % chords.length]);
    }
    return result;
  }

  melodyExtraction(audio: Audio): number[] {
    const melody: number[] = [];
    const frameSize = Math.floor(audio.sampleRate * 0.05);
    const hopSize = Math.floor(audio.sampleRate * 0.025);
    for (let i = 0; i < audio.samples.length; i += hopSize) {
      let maxCorr = 0;
      let bestFreq = 0;
      const minLag = Math.floor(audio.sampleRate / 2000);
      const maxLag = Math.floor(audio.sampleRate / 80);
      for (let lag = minLag; lag <= maxLag; lag += 2) {
        let corr = 0;
        for (let j = 0; j < frameSize && i + j + lag < audio.samples.length; j++) {
          corr += audio.samples[i + j] * audio.samples[i + j + lag];
        }
        if (corr > maxCorr) {
          maxCorr = corr;
          bestFreq = audio.sampleRate / lag;
        }
      }
      melody.push(bestFreq);
    }
    return melody;
  }

  pitchEstimation(audio: Audio): number {
    const melody = this.melodyExtraction(audio);
    if (melody.length === 0) return 0;
    const sum = melody.reduce((a, b) => a + b, 0);
    return sum / melody.length;
  }

  instrumentRecognition(audio: Audio): string[] {
    const instruments = ['piano', 'guitar', 'violin', 'drums', 'bass', 'vocals', 'saxophone', 'trumpet', 'flute', 'cello'];
    const result: string[] = [];
    const seed = this._hash('instruments' + audio.duration);
    const numInst = 2 + (seed % 4);
    for (let i = 0; i < numInst; i++) {
      const idx = this._hash('inst' + i + seed) % instruments.length;
      if (!result.includes(instruments[idx])) {
        result.push(instruments[idx]);
      }
    }
    return result;
  }

  lyricsAlignment(audio: Audio, lyrics: string[]): { word: string; startTime: number; endTime: number }[] {
    const result: { word: string; startTime: number; endTime: number }[] = [];
    const wordDuration = audio.duration / lyrics.length;
    for (let i = 0; i < lyrics.length; i++) {
      result.push({
        word: lyrics[i],
        startTime: i * wordDuration,
        endTime: (i + 1) * wordDuration
      });
    }
    return result;
  }

  musicStructure(audio: Audio): { section: string; startTime: number; endTime: number }[] {
    const sections = ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'];
    const result: { section: string; startTime: number; endTime: number }[] = [];
    const sectionDuration = audio.duration / sections.length;
    for (let i = 0; i < sections.length; i++) {
      result.push({
        section: sections[i],
        startTime: i * sectionDuration,
        endTime: (i + 1) * sectionDuration
      });
    }
    return result;
  }

  fingerprint(audio: Audio): string {
    let hash = 0;
    const step = Math.floor(audio.samples.length / 100);
    for (let i = 0; i < audio.samples.length; i += step) {
      hash = this._hashFloat(hash + audio.samples[i]);
    }
    return Math.abs(hash).toString(36);
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

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private _hashFloat(v: number): number {
    const str = v.toString();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  toPacket(): DataPacket<Music> {
    const result = this._lastMusic || {
      genre: '',
      mood: '',
      bpm: 0,
      key: '',
      mode: '',
      instruments: []
    };
    this._counter++;
    return {
      id: `music-info-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech', 'music-information'],
        priority: 1,
        phase: 'music-information'
      }
    };
  }

  reset(): void {
    this._musicInfos = [];
    this._features = [];
    this._counter = 0;
    this._modelType = 'default';
    this._lastMusic = null;
  }
}
