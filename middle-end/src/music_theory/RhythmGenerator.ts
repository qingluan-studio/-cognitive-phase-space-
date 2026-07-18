import { DataPacket, Signal } from '../shared/types';

export interface Beat {
  position: number;
  duration: number;
  velocity: number;
  accent: boolean;
  ghost: boolean;
}

export interface RhythmPattern {
  id: string;
  name: string;
  beats: Beat[];
  timeSignature: string;
  tempo: number;
  complexity: number;
  feel: string;
}

export interface Polyrhythm {
  id: string;
  layers: RhythmPattern[];
  composite: Beat[];
  layerCount: number;
  interferencePattern: number[];
  clarity: number;
}

interface RhythmHistoryEntry {
  timestamp: number;
  action: string;
  tempoDelta: number;
  complexityDelta: number;
}

const TIME_SIGNATURES = [
  { name: '4/4', beats: 4, beatValue: 4 },
  { name: '3/4', beats: 3, beatValue: 4 },
  { name: '6/8', beats: 6, beatValue: 8 },
  { name: '5/4', beats: 5, beatValue: 4 },
  { name: '7/8', beats: 7, beatValue: 8 },
  { name: '9/8', beats: 9, beatValue: 8 },
  { name: '12/8', beats: 12, beatValue: 8 },
];

const RHYTHM_FEELS = ['straight', 'swing', 'shuffle', 'bounce', 'laid-back', 'pushing', 'groove', 'marching'];

export class RhythmGenerator {
  private _patterns: RhythmPattern[] = [];
  private _polyrhythms: Polyrhythm[] = [];
  private _tempo: number = 120;
  private _timeSignature: string = '4/4';
  private _history: RhythmHistoryEntry[] = [];
  private _groove: number = 0.5;
  private _counter = 0;

  constructor() {
    this._initDefaultPatterns();
  }

  generatePattern(complexity: number = 0.5): RhythmPattern {
    const ts = this._getTimeSignature(this._timeSignature);
    const beats: Beat[] = [];
    const totalSubdivisions = ts.beats * (complexity > 0.7 ? 4 : complexity > 0.4 ? 2 : 1);
    const density = Math.min(1, complexity * 0.8 + 0.2);
    for (let i = 0; i < totalSubdivisions; i++) {
      const position = i / (totalSubdivisions / ts.beats);
      const isDownbeat = i % (totalSubdivisions / ts.beats) === 0;
      const shouldPlay = Math.random() < density || isDownbeat;
      if (shouldPlay) {
        const beat: Beat = {
          position,
          duration: 1 / (totalSubdivisions / ts.beats),
          velocity: 0.5 + Math.random() * 0.5,
          accent: isDownbeat && Math.random() > 0.3,
          ghost: false,
        };
        beats.push(beat);
      }
    }
    const feel = RHYTHM_FEELS[Math.floor(Math.random() * RHYTHM_FEELS.length)];
    const pattern: RhythmPattern = {
      id: `rhythm-${(++this._counter).toString(36)}`,
      name: `Pattern ${this._patterns.length + 1}`,
      beats,
      timeSignature: this._timeSignature,
      tempo: this._tempo,
      complexity,
      feel,
    };
    this._patterns.push(pattern);
    if (this._patterns.length > 50) {
      this._patterns = this._patterns.slice(-50);
    }
    this._recordHistory('generate-pattern', 0, complexity * 0.1);
    return { ...pattern, beats: [...pattern.beats] };
  }

  createPolyrhythm(layerCount: number = 2): Polyrhythm {
    const layers: RhythmPattern[] = [];
    const baseBeats = this._getTimeSignature(this._timeSignature).beats;
    for (let i = 0; i < layerCount; i++) {
      const layerBeats = baseBeats + i * 2;
      const beats: Beat[] = [];
      for (let j = 0; j < layerBeats; j++) {
        beats.push({
          position: j / layerBeats * baseBeats,
          duration: 1 / layerBeats * baseBeats,
          velocity: 0.7 - i * 0.15,
          accent: j === 0,
          ghost: false,
        });
      }
      layers.push({
        id: `poly-layer-${i}-${(++this._counter).toString(36)}`,
        name: `Layer ${i + 1} (${layerBeats} against ${baseBeats})`,
        beats,
        timeSignature: this._timeSignature,
        tempo: this._tempo,
        complexity: 0.5 + i * 0.15,
        feel: 'straight',
      });
    }
    const composite = this._compositeBeats(layers);
    const interferencePattern = this._interferencePattern(layers);
    const clarity = Math.max(0, 1 - layerCount * 0.15);
    const polyrhythm: Polyrhythm = {
      id: `polyrhythm-${(++this._counter).toString(36)}`,
      layers,
      composite,
      layerCount,
      interferencePattern,
      clarity,
    };
    this._polyrhythms.push(polyrhythm);
    if (this._polyrhythms.length > 30) {
      this._polyrhythms = this._polyrhythms.slice(-30);
    }
    this._recordHistory('create-polyrhythm', 0, layerCount * 0.1);
    return {
      ...polyrhythm,
      layers: polyrhythm.layers.map(l => ({ ...l, beats: [...l.beats] })),
      composite: [...polyrhythm.composite],
      interferencePattern: [...polyrhythm.interferencePattern],
    };
  }

  swingify(pattern: RhythmPattern, amount: number = 0.5): RhythmPattern {
    const swungBeats = pattern.beats.map(beat => {
      const swingOffset = (beat.position % 1) * amount * 0.2;
      return {
        ...beat,
        position: beat.position + swingOffset,
        velocity: beat.velocity * (1 + Math.random() * 0.1 - 0.05),
      };
    });
    const swungPattern: RhythmPattern = {
      ...pattern,
      id: `swung-${(++this._counter).toString(36)}`,
      name: `${pattern.name} (swung)`,
      beats: swungBeats,
      feel: 'swing',
      complexity: Math.min(1, pattern.complexity + 0.1),
    };
    this._patterns.push(swungPattern);
    this._groove = Math.min(1, this._groove + amount * 0.1);
    this._recordHistory('swingify', 0, 0.05);
    return { ...swungPattern, beats: [...swungPattern.beats] };
  }

  metricModulation(newTempo: number): { pivotRhythm: RhythmPattern; ratio: number } {
    const ratio = newTempo / this._tempo;
    const pivotPattern = this.generatePattern(0.5);
    this._tempo = newTempo;
    this._recordHistory('metric-modulation', newTempo - this._tempo, 0.05);
    return { pivotRhythm: pivotPattern, ratio };
  }

  syncopationLevel(pattern: RhythmPattern): number {
    const ts = this._getTimeSignature(pattern.timeSignature);
    const downbeats = new Set<number>();
    for (let i = 0; i < ts.beats; i++) {
      downbeats.add(i);
    }
    let offBeatCount = 0;
    pattern.beats.forEach(beat => {
      const isDownbeat = downbeats.has(Math.floor(beat.position));
      if (!isDownbeat && beat.velocity > 0.6) {
        offBeatCount++;
      }
    });
    const syncopation = pattern.beats.length > 0 ? offBeatCount / pattern.beats.length : 0;
    return Math.min(1, syncopation * 2);
  }

  addGhostNotes(pattern: RhythmPattern, density: number = 0.3): RhythmPattern {
    const newBeats: Beat[] = [...pattern.beats];
    const ghostCount = Math.floor(pattern.beats.length * density);
    for (let i = 0; i < ghostCount; i++) {
      const position = Math.random() * this._getTimeSignature(pattern.timeSignature).beats;
      newBeats.push({
        position,
        duration: 0.25,
        velocity: 0.2 + Math.random() * 0.2,
        accent: false,
        ghost: true,
      });
    }
    newBeats.sort((a, b) => a.position - b.position);
    const ghostPattern: RhythmPattern = {
      ...pattern,
      id: `ghost-${(++this._counter).toString(36)}`,
      name: `${pattern.name} + ghosts`,
      beats: newBeats,
      complexity: Math.min(1, pattern.complexity + 0.1),
    };
    this._patterns.push(ghostPattern);
    this._recordHistory('add-ghost-notes', 0, 0.05);
    return { ...ghostPattern, beats: [...newBeats] };
  }

  getTimeSignature(): { name: string; beats: number; beatValue: number } {
    return this._getTimeSignature(this._timeSignature);
  }

  toPacket(): DataPacket {
    return {
      id: `rhythm-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        patterns: this._patterns.map(p => ({ ...p, beats: [...p.beats] })),
        polyrhythms: this._polyrhythms.map(pr => ({
          ...pr,
          layers: pr.layers.map(l => ({ ...l, beats: [...l.beats] })),
          composite: [...pr.composite],
          interferencePattern: [...pr.interferencePattern],
        })),
        tempo: this._tempo,
        timeSignature: this._timeSignature,
        groove: this._groove,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['RhythmGenerator'],
        priority: Math.max(1, Math.floor(this._patterns.length * 0.3)),
        phase: this._groove > 0.7 ? 'grooving' : 'steady',
      },
    };
  }

  reset(): void {
    this._patterns = [];
    this._polyrhythms = [];
    this._tempo = 120;
    this._timeSignature = '4/4';
    this._history = [];
    this._groove = 0.5;
    this._counter = 0;
    this._initDefaultPatterns();
  }

  get patterns(): RhythmPattern[] {
    return this._patterns.map(p => ({ ...p, beats: [...p.beats] }));
  }

  get polyrhythms(): Polyrhythm[] {
    return this._polyrhythms.map(pr => ({
      ...pr,
      layers: pr.layers.map(l => ({ ...l, beats: [...l.beats] })),
      composite: [...pr.composite],
      interferencePattern: [...pr.interferencePattern],
    }));
  }

  get tempo(): number {
    return this._tempo;
  }

  get timeSignature(): string {
    return this._timeSignature;
  }

  get groove(): number {
    return this._groove;
  }

  get history(): RhythmHistoryEntry[] {
    return [...this._history];
  }

  private _initDefaultPatterns(): void {
    this.generatePattern(0.3);
    this.generatePattern(0.6);
  }

  private _getTimeSignature(name: string): { name: string; beats: number; beatValue: number } {
    return TIME_SIGNATURES.find(ts => ts.name === name) || TIME_SIGNATURES[0];
  }

  private _compositeBeats(layers: RhythmPattern[]): Beat[] {
    const composite: Beat[] = [];
    layers.forEach((layer, layerIndex) => {
      layer.beats.forEach(beat => {
        composite.push({
          ...beat,
          velocity: beat.velocity * (1 - layerIndex * 0.2),
          ghost: layerIndex > 1,
        });
      });
    });
    composite.sort((a, b) => a.position - b.position);
    return composite;
  }

  private _interferencePattern(layers: RhythmPattern[]): number[] {
    const resolution = 64;
    const pattern: number[] = new Array(resolution).fill(0);
    const ts = this._getTimeSignature(this._timeSignature);
    layers.forEach((layer, layerIndex) => {
      layer.beats.forEach(beat => {
        const idx = Math.floor((beat.position / ts.beats) * resolution) % resolution;
        pattern[idx] += 1 / layers.length;
      });
    });
    return pattern;
  }

  private _recordHistory(action: string, tempoDelta: number, complexityDelta: number): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      tempoDelta,
      complexityDelta,
    });
    if (this._history.length > 100) {
      this._history = this._history.slice(-100);
    }
  }
}
