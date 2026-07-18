import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface MelodicPhrase {
  id: string;
  notes: number[];
  durations: number[];
  contour: string;
  range: number;
  expression: string;
}

export interface Motive {
  id: string;
  name: string;
  notes: number[];
  durations: number[];
  intervals: number[];
  complexity: number;
  developmentHistory: string[];
}

export interface Contour {
  id: string;
  name: string;
  shape: number[];
  description: string;
  emotionalQuality: string;
}

interface MelodyHistoryEntry {
  timestamp: number;
  action: string;
  motiveCount: number;
  rangeDelta: number;
}

const CONTOUR_TYPES = [
  { name: 'ascending', shape: [0, 1, 2, 3, 4], desc: 'Rising melody', emotion: 'hopeful, triumphant' },
  { name: 'descending', shape: [4, 3, 2, 1, 0], desc: 'Falling melody', emotion: 'melancholic, peaceful' },
  { name: 'arch', shape: [0, 2, 4, 2, 0], desc: 'Rises then falls', emotion: 'dramatic, complete' },
  { name: 'inverted-arch', shape: [4, 2, 0, 2, 4], desc: 'Falls then rises', emotion: 'searching, questioning' },
  { name: 'static', shape: [2, 2, 2, 2, 2], desc: 'Unchanging pitch', emotion: 'stable, meditative' },
  { name: 'wave', shape: [1, 2, 1, 0, 1], desc: 'Undulating pattern', emotion: 'organic, flowing' },
  { name: 'stepwise', shape: [0, 1, 2, 1, 2], desc: 'Moves by steps', emotion: 'gentle, natural' },
  { name: 'leaping', shape: [0, 3, 1, 4, 0], desc: 'Wide intervals', emotion: 'energetic, bold' },
];

const ORNAMENT_TYPES = ['trill', 'turn', 'mordent', 'appoggiatura', 'grace-note', 'vibrato', 'slide', 'tremolo'];

export class MelodyShaper {
  private _motives: Map<string, Motive> = new Map();
  private _phrases: MelodicPhrase[] = [];
  private _contours: Map<string, Contour> = new Map();
  private _history: MelodyHistoryEntry[] = [];
  private _register: { low: number; high: number } = { low: 48, high: 84 };
  private _counter = 0;

  constructor() {
    this._initDefaultContours();
    this._seedMotives();
  }

  generateMotive(complexity: number = 0.5): Motive {
    const length = 3 + Math.floor(complexity * 5);
    const notes: number[] = [];
    const durations: number[] = [];
    const intervals: number[] = [];
    let currentNote = 60 + Math.floor(Math.random() * 12);
    for (let i = 0; i < length; i++) {
      notes.push(currentNote);
      durations.push(0.25 + Math.random() * 0.75);
      if (i > 0) {
        const interval = Math.floor((Math.random() - 0.5) * 12 * complexity);
        intervals.push(interval);
        currentNote = Math.max(this._register.low, Math.min(this._register.high, currentNote + interval));
      }
    }
    const motive: Motive = {
      id: `motive-${(++this._counter).toString(36)}`,
      name: `Motive ${this._motives.size + 1}`,
      notes,
      durations,
      intervals,
      complexity,
      developmentHistory: ['generated'],
    };
    this._motives.set(motive.id, motive);
    this._recordHistory('generate-motive', 1, 0.05);
    return { ...motive, notes: [...motive.notes], durations: [...motive.durations], intervals: [...motive.intervals], developmentHistory: [...motive.developmentHistory] };
  }

  developMotive(motiveId: string, technique: string): Motive | null {
    const motive = this._motives.get(motiveId);
    if (!motive) return null;
    let newNotes = [...motive.notes];
    let newDurations = [...motive.durations];
    switch (technique) {
      case 'inversion':
        newNotes = this._invertMotive(motive.notes);
        break;
      case 'retrograde':
        newNotes = [...motive.notes].reverse();
        newDurations = [...motive.durations].reverse();
        break;
      case 'augmentation':
        newDurations = motive.durations.map(d => d * 2);
        break;
      case 'diminution':
        newDurations = motive.durations.map(d => d / 2);
        break;
      case 'transposition':
        const shift = Math.floor(Math.random() * 12) - 6;
        newNotes = motive.notes.map(n => n + shift);
        break;
      case 'fragmentation':
        const fragmentLen = Math.ceil(motive.notes.length / 2);
        newNotes = motive.notes.slice(0, fragmentLen);
        newDurations = motive.durations.slice(0, fragmentLen);
        break;
      case 'sequence':
        const sequenceStep = Math.random() > 0.5 ? 2 : -2;
        const seqNotes = [...motive.notes];
        for (let i = 0; i < motive.notes.length; i++) {
          seqNotes.push(motive.notes[i] + sequenceStep);
          newDurations.push(motive.durations[i]);
        }
        newNotes = seqNotes;
        break;
      default:
        break;
    }
    const newIntervals: number[] = [];
    for (let i = 1; i < newNotes.length; i++) {
      newIntervals.push(newNotes[i] - newNotes[i - 1]);
    }
    const developed: Motive = {
      id: `motive-dev-${(++this._counter).toString(36)}`,
      name: `${motive.name} (${technique})`,
      notes: newNotes,
      durations: newDurations,
      intervals: newIntervals,
      complexity: Math.min(1, motive.complexity + 0.1),
      developmentHistory: [...motive.developmentHistory, technique],
    };
    this._motives.set(developed.id, developed);
    this._recordHistory('develop-motive', 1, 0.03);
    return { ...developed, notes: [...developed.notes], durations: [...developed.durations], intervals: [...developed.intervals], developmentHistory: [...developed.developmentHistory] };
  }

  contourShape(notes: number[]): Contour {
    if (notes.length < 2) {
      return {
        id: 'contour-static',
        name: 'static',
        shape: [0],
        description: 'Single note',
        emotionalQuality: 'neutral',
      };
    }
    const normalized = this._normalizeContour(notes);
    let bestMatch: Contour | null = null;
    let bestScore = -Infinity;
    for (const contour of this._contours.values()) {
      const score = this._contourSimilarity(normalized, contour.shape);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = contour;
      }
    }
    return bestMatch || Array.from(this._contours.values())[0];
  }

  phraseGenerate(length: number = 8): MelodicPhrase {
    const notes: number[] = [];
    const durations: number[] = [];
    let currentNote = 60 + Math.floor(Math.random() * 12);
    const contour = Array.from(this._contours.values())[Math.floor(Math.random() * this._contours.size)];
    for (let i = 0; i < length; i++) {
      const contourIdx = Math.floor((i / length) * contour.shape.length);
      const contourVal = contour.shape[Math.min(contourIdx, contour.shape.length - 1)];
      const targetNote = this._register.low + (contourVal / 4) * (this._register.high - this._register.low);
      currentNote = Math.round(currentNote + (targetNote - currentNote) * 0.3 + (Math.random() - 0.5) * 4);
      currentNote = Math.max(this._register.low, Math.min(this._register.high, currentNote));
      notes.push(currentNote);
      durations.push(0.25 + Math.random() * 0.75);
    }
    const range = this.getRange(notes);
    const phrase: MelodicPhrase = {
      id: `phrase-${(++this._counter).toString(36)}`,
      notes,
      durations,
      contour: contour.name,
      range,
      expression: this._phraseExpression(contour.name),
    };
    this._phrases.push(phrase);
    if (this._phrases.length > 50) {
      this._phrases = this._phrases.slice(-50);
    }
    this._recordHistory('phrase-generate', 0, range / 100);
    return { ...phrase, notes: [...phrase.notes], durations: [...phrase.durations] };
  }

  sequence(motive: Motive, steps: number = 3): Motive {
    const newNotes = [...motive.notes];
    const newDurations = [...motive.durations];
    const stepSize = Math.random() > 0.5 ? 2 : -2;
    for (let s = 1; s <= Math.abs(steps); s++) {
      const direction = steps > 0 ? 1 : -1;
      motive.notes.forEach(note => {
        newNotes.push(note + stepSize * s * direction);
      });
      motive.durations.forEach(d => {
        newDurations.push(d);
      });
    }
    const intervals: number[] = [];
    for (let i = 1; i < newNotes.length; i++) {
      intervals.push(newNotes[i] - newNotes[i - 1]);
    }
    const sequenced: Motive = {
      id: `motive-seq-${(++this._counter).toString(36)}`,
      name: `${motive.name} (sequenced)`,
      notes: newNotes,
      durations: newDurations,
      intervals,
      complexity: Math.min(1, motive.complexity + 0.15),
      developmentHistory: [...motive.developmentHistory, 'sequence'],
    };
    this._motives.set(sequenced.id, sequenced);
    this._recordHistory('sequence', 1, 0.05);
    return { ...sequenced, notes: [...sequenced.notes], durations: [...sequenced.durations], intervals: [...sequenced.intervals], developmentHistory: [...sequenced.developmentHistory] };
  }

  ornament(phrase: MelodicPhrase, type: string): MelodicPhrase {
    const newNotes = [...phrase.notes];
    const newDurations = [...phrase.durations];
    const ornamentedNotes: number[] = [];
    const ornamentedDurations: number[] = [];
    for (let i = 0; i < newNotes.length; i++) {
      const note = newNotes[i];
      const duration = newDurations[i];
      switch (type) {
        case 'trill':
          ornamentedNotes.push(note, note + 1, note, note + 1);
          ornamentedDurations.push(duration / 4, duration / 4, duration / 4, duration / 4);
          break;
        case 'mordent':
          ornamentedNotes.push(note, note + 1, note);
          ornamentedDurations.push(duration / 3, duration / 3, duration / 3);
          break;
        case 'turn':
          ornamentedNotes.push(note, note + 1, note, note - 1, note);
          ornamentedDurations.push(duration / 5, duration / 5, duration / 5, duration / 5, duration / 5);
          break;
        case 'grace-note':
          if (i < newNotes.length - 1) {
            ornamentedNotes.push(note + 1, note);
            ornamentedDurations.push(duration * 0.1, duration * 0.9);
          } else {
            ornamentedNotes.push(note);
            ornamentedDurations.push(duration);
          }
          break;
        default:
          ornamentedNotes.push(note);
          ornamentedDurations.push(duration);
      }
    }
    const ornamented: MelodicPhrase = {
      id: `phrase-orn-${(++this._counter).toString(36)}`,
      notes: ornamentedNotes,
      durations: ornamentedDurations,
      contour: phrase.contour,
      range: this.getRange(ornamentedNotes),
      expression: `${phrase.expression} + ${type}`,
    };
    this._phrases.push(ornamented);
    this._recordHistory('ornament', 0, 0.02);
    return { ...ornamented, notes: [...ornamented.notes], durations: [...ornamented.durations] };
  }

  getRange(notes: number[]): number {
    if (notes.length === 0) return 0;
    const min = Math.min(...notes);
    const max = Math.max(...notes);
    return max - min;
  }

  toPacket(): DataPacket {
    return {
      id: `melody-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        motives: Array.from(this._motives.values()).map(m => ({ ...m, notes: [...m.notes], durations: [...m.durations], intervals: [...m.intervals], developmentHistory: [...m.developmentHistory] })),
        phrases: this._phrases.map(p => ({ ...p, notes: [...p.notes], durations: [...p.durations] })),
        contours: Array.from(this._contours.values()),
        register: { ...this._register },
        motiveCount: this._motives.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['MelodyShaper'],
        priority: Math.max(1, Math.floor(this._phrases.length * 0.3)),
        phase: this._register.high - this._register.low > 36 ? 'wide-ranging' : 'focused',
      },
    };
  }

  reset(): void {
    this._motives.clear();
    this._phrases = [];
    this._contours.clear();
    this._history = [];
    this._register = { low: 48, high: 84 };
    this._counter = 0;
    this._initDefaultContours();
    this._seedMotives();
  }

  get motives(): Motive[] {
    return Array.from(this._motives.values()).map(m => ({ ...m, notes: [...m.notes], durations: [...m.durations], intervals: [...m.intervals], developmentHistory: [...m.developmentHistory] }));
  }

  get phrases(): MelodicPhrase[] {
    return this._phrases.map(p => ({ ...p, notes: [...p.notes], durations: [...p.durations] }));
  }

  get contours(): Contour[] {
    return Array.from(this._contours.values());
  }

  get register(): { low: number; high: number } {
    return { ...this._register };
  }

  get history(): MelodyHistoryEntry[] {
    return [...this._history];
  }

  private _initDefaultContours(): void {
    CONTOUR_TYPES.forEach((c, i) => {
      const contour: Contour = {
        id: `contour-${i}`,
        name: c.name,
        shape: c.shape,
        description: c.desc,
        emotionalQuality: c.emotion,
      };
      this._contours.set(contour.id, contour);
    });
  }

  private _seedMotives(): void {
    for (let i = 0; i < 3; i++) {
      this.generateMotive(0.3 + i * 0.2);
    }
  }

  private _invertMotive(notes: number[]): number[] {
    if (notes.length < 2) return [...notes];
    const axis = notes[0];
    return notes.map(n => axis - (n - axis));
  }

  private _normalizeContour(notes: number[]): number[] {
    if (notes.length < 2) return [2];
    const min = Math.min(...notes);
    const max = Math.max(...notes);
    const range = max - min || 1;
    return notes.map(n => Math.round(((n - min) / range) * 4));
  }

  private _contourSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let totalDiff = 0;
    for (let i = 0; i < len; i++) {
      const aIdx = Math.floor((i / len) * a.length);
      const bIdx = Math.floor((i / len) * b.length);
      totalDiff += Math.abs(a[aIdx] - b[bIdx]);
    }
    return 1 - totalDiff / (len * 4);
  }

  private _phraseExpression(contourName: string): string {
    const expressions: Record<string, string> = {
      'ascending': 'crescendo, brightening',
      'descending': 'diminuendo, darkening',
      'arch': 'crescendo then diminuendo',
      'inverted-arch': 'diminuendo then crescendo',
      'static': 'calm, steady',
      'wave': 'flexible, organic',
      'stepwise': 'conjunct, smooth',
      'leaping': 'disjunct, energetic',
    };
    return expressions[contourName] || 'expressive';
  }

  private _recordHistory(action: string, motiveCount: number, rangeDelta: number): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      motiveCount,
      rangeDelta,
    });
    if (this._history.length > 100) {
      this._history = this._history.slice(-100);
    }
  }
}
