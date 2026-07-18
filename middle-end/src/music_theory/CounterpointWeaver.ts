import { DataPacket, KnowledgeUnit } from '../shared/types';

export interface Voice {
  id: string;
  name: string;
  notes: number[];
  durations: number[];
  range: { low: number; high: number };
  independence: number;
}

export interface ContrapuntalPair {
  id: string;
  voiceA: Voice;
  voiceB: Voice;
  consonanceScore: number;
  independenceScore: number;
  species: number;
  quality: string;
}

export interface FugueSubject {
  id: string;
  subject: number[];
  answer: number[];
  countersubject: number[];
  key: string;
  answerType: 'real' | 'tonal';
  expositionLength: number;
}

interface CounterpointHistoryEntry {
  timestamp: number;
  action: string;
  voiceCount: number;
  consonanceDelta: number;
}

const CONSONANT_INTERVALS = [0, 3, 4, 5, 7, 8, 9, 12];
const DISSONANT_INTERVALS = [1, 2, 6, 10, 11];
const PERFECT_INTERVALS = [0, 5, 7, 12];

export class CounterpointWeaver {
  private _voices: Map<string, Voice> = new Map();
  private _pairs: ContrapuntalPair[] = [];
  private _fugueSubjects: FugueSubject[] = [];
  private _history: CounterpointHistoryEntry[] = [];
  private _speciesCounterpoint: Map<number, string> = new Map();
  private _counter = 0;

  constructor() {
    this._initSpecies();
  }

  addVoice(notes: number[], name: string = ''): Voice {
    const low = Math.min(...notes);
    const high = Math.max(...notes);
    const voice: Voice = {
      id: `voice-${(++this._counter).toString(36)}`,
      name: name || `Voice ${this._voices.size + 1}`,
      notes: [...notes],
      durations: notes.map(() => 1),
      range: { low, high },
      independence: 0.5 + Math.random() * 0.3,
    };
    this._voices.set(voice.id, voice);
    this._recordHistory('add-voice', 1, 0.02);
    return { ...voice, notes: [...voice.notes], durations: [...voice.durations] };
  }

  twoPartCounterpoint(voiceA: Voice, voiceB: Voice): ContrapuntalPair {
    const minLen = Math.min(voiceA.notes.length, voiceB.notes.length);
    let consonantCount = 0;
    let parallelPerfects = 0;
    let prevInterval = -1;
    for (let i = 0; i < minLen; i++) {
      const interval = Math.abs(voiceA.notes[i] - voiceB.notes[i]) % 12;
      if (CONSONANT_INTERVALS.includes(interval)) {
        consonantCount++;
      }
      if (i > 0 && PERFECT_INTERVALS.includes(interval) && interval === prevInterval) {
        parallelPerfects++;
      }
      prevInterval = interval;
    }
    const consonanceScore = minLen > 0 ? consonantCount / minLen : 0;
    const independenceScore = this._calculateIndependence(voiceA, voiceB);
    const quality = this._rateQuality(consonanceScore, independenceScore, parallelPerfects);
    const pair: ContrapuntalPair = {
      id: `pair-${(++this._counter).toString(36)}`,
      voiceA: { ...voiceA, notes: [...voiceA.notes], durations: [...voiceA.durations] },
      voiceB: { ...voiceB, notes: [...voiceB.notes], durations: [...voiceB.durations] },
      consonanceScore,
      independenceScore,
      species: this._determineSpecies(voiceA, voiceB),
      quality,
    };
    this._pairs.push(pair);
    if (this._pairs.length > 30) {
      this._pairs = this._pairs.slice(-30);
    }
    this._recordHistory('two-part-counterpoint', 2, consonanceScore * 0.1);
    return {
      ...pair,
      voiceA: { ...pair.voiceA, notes: [...pair.voiceA.notes], durations: [...pair.voiceA.durations] },
      voiceB: { ...pair.voiceB, notes: [...pair.voiceB.notes], durations: [...pair.voiceB.durations] },
    };
  }

  checkConsonance(interval: number): { consonant: boolean; type: string; level: number } {
    const normalized = Math.abs(interval) % 12;
    if (PERFECT_INTERVALS.includes(normalized)) {
      return { consonant: true, type: 'perfect', level: 1.0 };
    }
    if (CONSONANT_INTERVALS.includes(normalized)) {
      return { consonant: true, type: 'imperfect', level: 0.7 };
    }
    if (normalized === 6) {
      return { consonant: false, type: 'dissonant-tritone', level: 0.3 };
    }
    return { consonant: false, type: 'dissonant', level: 0.2 };
  }

  speciesCounterpoint(species: number = 1): { rules: string[]; example: Voice[] } {
    const rules = this._speciesRules(species);
    const cantusFirmus = this._generateCantusFirmus();
    const counterpoint = this._generateSpeciesCounterpoint(cantusFirmus, species);
    const example: Voice[] = [
      {
        id: 'cf-example',
        name: 'Cantus Firmus',
        notes: cantusFirmus,
        durations: cantusFirmus.map(() => 1),
        range: { low: Math.min(...cantusFirmus), high: Math.max(...cantusFirmus) },
        independence: 0.5,
      },
      {
        id: 'cp-example',
        name: `Species ${species} Counterpoint`,
        notes: counterpoint,
        durations: this._speciesDurations(counterpoint.length, species),
        range: { low: Math.min(...counterpoint), high: Math.max(...counterpoint) },
        independence: 0.7,
      },
    ];
    this._recordHistory('species-counterpoint', 2, 0.05);
    return { rules, example };
  }

  fugueExposition(subject: number[]): FugueSubject {
    const answerType: 'real' | 'tonal' = Math.random() > 0.5 ? 'real' : 'tonal';
    const answer = this._generateAnswer(subject, answerType);
    const countersubject = this._generateCountersubject(subject);
    const fugue: FugueSubject = {
      id: `fugue-${(++this._counter).toString(36)}`,
      subject: [...subject],
      answer,
      countersubject,
      key: 'C major',
      answerType,
      expositionLength: subject.length * 2,
    };
    this._fugueSubjects.push(fugue);
    if (this._fugueSubjects.length > 20) {
      this._fugueSubjects = this._fugueSubjects.slice(-20);
    }
    this._recordHistory('fugue-exposition', 3, 0.1);
    return {
      ...fugue,
      subject: [...fugue.subject],
      answer: [...fugue.answer],
      countersubject: [...fugue.countersubject],
    };
  }

  answerSubject(subject: number[], answerType: 'real' | 'tonal'): number[] {
    return this._generateAnswer(subject, answerType);
  }

  getIndependenceScore(voiceA: Voice, voiceB: Voice): number {
    return this._calculateIndependence(voiceA, voiceB);
  }

  toPacket(): DataPacket {
    return {
      id: `counterpoint-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        voices: Array.from(this._voices.values()).map(v => ({ ...v, notes: [...v.notes], durations: [...v.durations] })),
        pairs: this._pairs.map(p => ({
          ...p,
          voiceA: { ...p.voiceA, notes: [...p.voiceA.notes], durations: [...p.voiceA.durations] },
          voiceB: { ...p.voiceB, notes: [...p.voiceB.notes], durations: [...p.voiceB.durations] },
        })),
        fugueSubjects: this._fugueSubjects.map(f => ({
          ...f,
          subject: [...f.subject],
          answer: [...f.answer],
          countersubject: [...f.countersubject],
        })),
        speciesCounterpoint: Object.fromEntries(this._speciesCounterpoint),
        voiceCount: this._voices.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['CounterpointWeaver'],
        priority: Math.max(1, Math.floor(this._pairs.length * 0.5)),
        phase: this._voices.size > 3 ? 'polyphonic' : 'monophonic',
      },
    };
  }

  reset(): void {
    this._voices.clear();
    this._pairs = [];
    this._fugueSubjects = [];
    this._history = [];
    this._speciesCounterpoint.clear();
    this._counter = 0;
    this._initSpecies();
  }

  get voices(): Voice[] {
    return Array.from(this._voices.values()).map(v => ({ ...v, notes: [...v.notes], durations: [...v.durations] }));
  }

  get pairs(): ContrapuntalPair[] {
    return this._pairs.map(p => ({
      ...p,
      voiceA: { ...p.voiceA, notes: [...p.voiceA.notes], durations: [...p.voiceA.durations] },
      voiceB: { ...p.voiceB, notes: [...p.voiceB.notes], durations: [...p.voiceB.durations] },
    }));
  }

  get fugueSubjects(): FugueSubject[] {
    return this._fugueSubjects.map(f => ({
      ...f,
      subject: [...f.subject],
      answer: [...f.answer],
      countersubject: [...f.countersubject],
    }));
  }

  get history(): CounterpointHistoryEntry[] {
    return [...this._history];
  }

  private _initSpecies(): void {
    const speciesNames = [
      'First Species: Note-against-note',
      'Second Species: Two notes against one',
      'Third Species: Four notes against one',
      'Fourth Species: Syncopation/suspensions',
      'Fifth Species: Florid counterpoint',
    ];
    speciesNames.forEach((name, i) => {
      this._speciesCounterpoint.set(i + 1, name);
    });
  }

  private _speciesRules(species: number): string[] {
    const allRules: Record<number, string[]> = {
      1: [
        'One note of counterpoint per note of cantus firmus',
        'Start and end on perfect consonance (unison, 5th, or octave)',
        'Use mostly imperfect consonances (3rds, 6ths)',
        'No parallel perfect intervals',
        'Contrary motion preferred',
      ],
      2: [
        'Two notes of counterpoint per note of cantus firmus',
        'First note of each measure: consonant',
        'Second note: passing tone or neighbor tone allowed',
        'Start with half rest if counterpoint is above',
        'End on perfect consonance',
      ],
      3: [
        'Four notes of counterpoint per note of cantus firmus',
        'Nota cambiata (changing tones) allowed',
        'Stepwise motion predominates',
        'Occasional leaps followed by stepwise return',
      ],
      4: [
        'Syncopation across bar lines',
        'Suspensions: preparation, suspension, resolution',
        'Dissonance on the strong beat resolves down by step',
        '7-6, 4-3, and 9-8 suspensions common',
      ],
      5: [
        'Combination of all previous species',
        'Variety of note values',
        'Overall melodic contour must be graceful',
        'Balance between consonance and dissonance',
      ],
    };
    return allRules[species] || allRules[1];
  }

  private _generateCantusFirmus(): number[] {
    const length = 8 + Math.floor(Math.random() * 5);
    const notes: number[] = [];
    let current = 60;
    for (let i = 0; i < length; i++) {
      notes.push(current);
      if (i < length - 1) {
        const step = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
        current = Math.max(55, Math.min(67, current + step));
      }
    }
    notes[0] = 60;
    notes[notes.length - 1] = 60;
    if (notes.length > 5) {
      notes[Math.floor(notes.length / 2)] = 67;
    }
    return notes;
  }

  private _generateSpeciesCounterpoint(cantus: number[], species: number): number[] {
    const multiplier = species === 1 ? 1 : species === 2 ? 2 : species === 3 ? 4 : species === 4 ? 2 : 3;
    const cp: number[] = [];
    for (let i = 0; i < cantus.length; i++) {
      const baseNote = cantus[i] + 12;
      for (let j = 0; j < multiplier; j++) {
        if (j === 0 || species === 1) {
          const intervals = [3, 4, 7, 8, 9, 12];
          const interval = intervals[Math.floor(Math.random() * intervals.length)];
          cp.push(baseNote + interval);
        } else {
          const prev = cp[cp.length - 1];
          const step = Math.random() > 0.5 ? 1 : -1;
          cp.push(prev + step);
        }
      }
    }
    return cp;
  }

  private _speciesDurations(length: number, species: number): number[] {
    const durations: number[] = [];
    for (let i = 0; i < length; i++) {
      durations.push(species === 1 ? 1 : species === 2 ? 0.5 : species === 3 ? 0.25 : 0.5);
    }
    return durations;
  }

  private _calculateIndependence(voiceA: Voice, voiceB: Voice): number {
    if (voiceA.notes.length < 2 || voiceB.notes.length < 2) return 0.5;
    let contraryMotion = 0;
    let obliqueMotion = 0;
    let similarMotion = 0;
    const minLen = Math.min(voiceA.notes.length, voiceB.notes.length);
    for (let i = 1; i < minLen; i++) {
      const dirA = Math.sign(voiceA.notes[i] - voiceA.notes[i - 1]);
      const dirB = Math.sign(voiceB.notes[i] - voiceB.notes[i - 1]);
      if (dirA === 0 || dirB === 0) {
        obliqueMotion++;
      } else if (dirA !== dirB) {
        contraryMotion++;
      } else {
        similarMotion++;
      }
    }
    const totalMotions = contraryMotion + obliqueMotion + similarMotion;
    if (totalMotions === 0) return 0.5;
    const independenceScore = (contraryMotion * 1.5 + obliqueMotion * 1 + similarMotion * 0.3) / totalMotions;
    return Math.min(1, independenceScore);
  }

  private _determineSpecies(voiceA: Voice, voiceB: Voice): number {
    const ratio = voiceA.durations[0] / (voiceB.durations[0] || 1);
    if (Math.abs(ratio - 1) < 0.1) return 1;
    if (Math.abs(ratio - 0.5) < 0.1 || Math.abs(ratio - 2) < 0.1) return 2;
    if (Math.abs(ratio - 0.25) < 0.05 || Math.abs(ratio - 4) < 0.2) return 3;
    return 5;
  }

  private _rateQuality(consonance: number, independence: number, parallelPerfects: number): string {
    const score = consonance * 0.4 + independence * 0.4 + (1 - Math.min(1, parallelPerfects * 0.2)) * 0.2;
    if (score > 0.85) return 'excellent';
    if (score > 0.7) return 'good';
    if (score > 0.5) return 'moderate';
    if (score > 0.3) return 'fair';
    return 'poor';
  }

  private _generateAnswer(subject: number[], type: 'real' | 'tonal'): number[] {
    const transposition = type === 'real' ? 7 : 5;
    return subject.map(n => n + transposition);
  }

  private _generateCountersubject(subject: number[]): number[] {
    return subject.map((note, i) => {
      const interval = i % 3 === 0 ? 9 : i % 3 === 1 ? 7 : 4;
      return note + interval;
    });
  }

  private _recordHistory(action: string, voiceCount: number, consonanceDelta: number): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      voiceCount,
      consonanceDelta,
    });
    if (this._history.length > 100) {
      this._history = this._history.slice(-100);
    }
  }
}
