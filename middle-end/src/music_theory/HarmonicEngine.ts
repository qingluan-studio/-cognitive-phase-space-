import { DataPacket, Signal } from '../shared/types';

export interface Chord {
  id: string;
  root: string;
  quality: string;
  inversion: number;
  notes: number[];
  tension: number;
  resolution: number;
  function: string;
}

export interface Scale {
  id: string;
  root: string;
  mode: string;
  notes: number[];
  intervals: number[];
  character: string;
}

export interface HarmonyProgression {
  id: string;
  chords: Chord[];
  key: string;
  functional: boolean;
  tensionCurve: number[];
  cadence: string;
}

interface HarmonyHistoryEntry {
  timestamp: number;
  action: string;
  keyChange: boolean;
  tensionDelta: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SCALE_INTERVALS: Record<string, number[]> = {
  'major': [0, 2, 4, 5, 7, 9, 11],
  'natural-minor': [0, 2, 3, 5, 7, 8, 10],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic-minor': [0, 2, 3, 5, 7, 9, 11],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'lydian': [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'locrian': [0, 1, 3, 5, 6, 8, 10],
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
  'blues': [0, 3, 5, 6, 7, 10],
  'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const CHORD_QUALITIES: Record<string, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'diminished': [0, 3, 6],
  'augmented': [0, 4, 8],
  'major7': [0, 4, 7, 11],
  'minor7': [0, 3, 7, 10],
  'dominant7': [0, 4, 7, 10],
  'diminished7': [0, 3, 6, 9],
  'half-diminished7': [0, 3, 6, 10],
  'minor-major7': [0, 3, 7, 11],
  'add9': [0, 4, 7, 14],
  'sus4': [0, 5, 7],
  'sus2': [0, 2, 7],
  '6': [0, 4, 7, 9],
  'minor6': [0, 3, 7, 9],
};

const FUNCTIONAL_HARMONY: Record<string, string[]> = {
  'major': ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'viio'],
  'minor': ['i', 'iio', 'III', 'iv', 'V', 'VI', 'VII'],
};

export class HarmonicEngine {
  private _scales: Map<string, Scale> = new Map();
  private _chords: Chord[] = [];
  private _progressions: HarmonyProgression[] = [];
  private _currentKey: string = 'C major';
  private _history: HarmonyHistoryEntry[] = [];
  private _counter = 0;

  constructor() {
    this._initDefaultScales();
  }

  buildChord(root: string, quality: string = 'major', inversion: number = 0): Chord {
    const rootIndex = NOTE_NAMES.indexOf(root.toUpperCase());
    if (rootIndex === -1) throw new Error(`Invalid root note: ${root}`);
    const intervals = CHORD_QUALITIES[quality] || CHORD_QUALITIES['major'];
    let notes = intervals.map(interval => (rootIndex + interval) % 12);
    for (let i = 0; i < inversion && notes.length > 0; i++) {
      const bass = notes.shift()!;
      notes.push(bass);
    }
    const tension = this._calculateChordTension(quality, inversion);
    const resolution = this._calculateResolution(quality);
    const chordFunc = this._determineChordFunction(root, quality);
    const chord: Chord = {
      id: `chord-${(++this._counter).toString(36)}`,
      root: root.toUpperCase(),
      quality,
      inversion,
      notes,
      tension,
      resolution,
      function: chordFunc,
    };
    this._chords.push(chord);
    if (this._chords.length > 100) {
      this._chords = this._chords.slice(-100);
    }
    this._recordHistory('build-chord', false, tension * 0.05);
    return { ...chord };
  }

  generateScale(root: string, mode: string = 'major'): Scale {
    const rootIndex = NOTE_NAMES.indexOf(root.toUpperCase());
    if (rootIndex === -1) throw new Error(`Invalid root note: ${root}`);
    const intervals = SCALE_INTERVALS[mode] || SCALE_INTERVALS['major'];
    const notes = intervals.map(interval => (rootIndex + interval) % 12);
    const character = this._scaleCharacter(mode);
    const scale: Scale = {
      id: `scale-${(++this._counter).toString(36)}`,
      root: root.toUpperCase(),
      mode,
      notes,
      intervals,
      character,
    };
    this._scales.set(scale.id, scale);
    this._recordHistory('generate-scale', false, 0.02);
    return { ...scale };
  }

  functionalHarmony(progression: string[]): HarmonyProgression {
    const [keyRoot, keyMode] = this._currentKey.split(' ');
    const functions = FUNCTIONAL_HARMONY[keyMode] || FUNCTIONAL_HARMONY['major'];
    const chords: Chord[] = progression.map(func => {
      const degreeIndex = this._functionToDegree(func);
      const scale = this._scales.get(Array.from(this._scales.keys())[0]);
      const scaleNotes = scale ? scale.notes : SCALE_INTERVALS[keyMode].map(i => i % 12);
      const rootNoteIdx = scaleNotes[degreeIndex % scaleNotes.length];
      const rootName = NOTE_NAMES[rootNoteIdx % 12];
      const quality = this._functionToQuality(func, keyMode);
      return this.buildChord(rootName, quality);
    });
    const tensionCurve = chords.map(c => c.tension);
    const cadence = this._detectCadence(progression);
    const harmProgression: HarmonyProgression = {
      id: `prog-${(++this._counter).toString(36)}`,
      chords,
      key: this._currentKey,
      functional: true,
      tensionCurve,
      cadence,
    };
    this._progressions.push(harmProgression);
    if (this._progressions.length > 50) {
      this._progressions = this._progressions.slice(-50);
    }
    this._recordHistory('functional-harmony', false, 0.1);
    return { ...harmProgression, chords: harmProgression.chords.map(c => ({ ...c })) };
  }

  voiceLeading(fromChord: Chord, toChord: Chord): { voices: number[][]; smoothness: number } {
    const fromNotes = [...fromChord.notes];
    const toNotes = [...toChord.notes];
    while (fromNotes.length < toNotes.length) fromNotes.push(fromNotes[0]);
    while (toNotes.length < fromNotes.length) toNotes.push(toNotes[0]);
    const voices: number[][] = [];
    let totalMotion = 0;
    for (let i = 0; i < Math.min(fromNotes.length, toNotes.length); i++) {
      let bestMotion = Infinity;
      let bestDest = toNotes[i];
      for (let octave = -1; octave <= 1; octave++) {
        const dest = (toNotes[i] + octave * 12 + 12) % 12;
        const motion = Math.abs(fromNotes[i] - dest);
        const wrappedMotion = 12 - motion;
        const actualMotion = Math.min(motion, wrappedMotion);
        if (actualMotion < bestMotion) {
          bestMotion = actualMotion;
          bestDest = dest;
        }
      }
      voices.push([fromNotes[i], bestDest]);
      totalMotion += bestMotion;
    }
    const maxMotion = Math.min(fromNotes.length, toNotes.length) * 6;
    const smoothness = maxMotion > 0 ? 1 - totalMotion / maxMotion : 1;
    this._recordHistory('voice-leading', false, -0.02);
    return { voices, smoothness };
  }

  cadenceDetect(progression: string[]): string {
    if (progression.length < 2) return 'none';
    const lastTwo = progression.slice(-2);
    const cadencePatterns: Record<string, string> = {
      'V-I': 'perfect-authentic',
      'IV-I': 'plagal',
      'V-vi': 'deceptive',
      'ii-V': 'half',
      'iio-V': 'half-diminished',
      'viio-I': 'leading-tone',
    };
    const pattern = lastTwo.join('-');
    const reversePattern = lastTwo.reverse().join('-');
    const cadence = cadencePatterns[pattern] || cadencePatterns[reversePattern] || 'undefined';
    this._recordHistory('cadence-detect', false, 0.01);
    return cadence;
  }

  modulateTo(newKey: string): { pivotChord: Chord | null; smoothness: number } {
    const [newRoot, newMode] = newKey.split(' ');
    if (!NOTE_NAMES.includes(newRoot.toUpperCase())) {
      return { pivotChord: null, smoothness: 0 };
    }
    const oldScaleNotes = this._getCurrentScaleNotes();
    const newScale = this.generateScale(newRoot, newMode || 'major');
    const newScaleNotes = newScale.notes;
    const commonNotes = oldScaleNotes.filter(n => newScaleNotes.includes(n));
    const smoothness = commonNotes.length / Math.max(oldScaleNotes.length, newScaleNotes.length);
    let pivotChord: Chord | null = null;
    if (commonNotes.length >= 3) {
      const pivotRoot = NOTE_NAMES[commonNotes[0]];
      pivotChord = this.buildChord(pivotRoot, 'major');
    }
    this._currentKey = `${newRoot.toUpperCase()} ${newMode || 'major'}`;
    this._recordHistory('modulate', true, smoothness * 0.1);
    return { pivotChord, smoothness };
  }

  tensionRelease(chord: Chord): { tension: number; releasePotential: number; resolution: Chord } {
    const tension = chord.tension;
    const releasePotential = chord.resolution;
    const [keyRoot, keyMode] = this._currentKey.split(' ');
    const resolutionChord = this.buildChord(keyRoot, keyMode === 'minor' ? 'minor' : 'major');
    this._recordHistory('tension-release', false, -tension * 0.1);
    return { tension, releasePotential, resolution: resolutionChord };
  }

  getCircleOfFifths(): { keys: string[]; distances: Map<string, number> } {
    const keys: string[] = [];
    const distances = new Map<string, number>();
    let current = 0;
    for (let i = 0; i < 12; i++) {
      const majorKey = `${NOTE_NAMES[current]} major`;
      const minorKey = `${NOTE_NAMES[(current + 9) % 12]} minor`;
      keys.push(majorKey);
      keys.push(minorKey);
      distances.set(majorKey, i);
      distances.set(minorKey, i);
      current = (current + 7) % 12;
    }
    return { keys, distances };
  }

  toPacket(): DataPacket {
    return {
      id: `harmonic-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        scales: Array.from(this._scales.values()),
        chords: [...this._chords],
        progressions: [...this._progressions],
        currentKey: this._currentKey,
        circleOfFifths: this.getCircleOfFifths(),
      },
      metadata: {
        createdAt: Date.now(),
        route: ['HarmonicEngine'],
        priority: Math.max(1, Math.floor(this._progressions.length * 0.5)),
        phase: this._currentKey.includes('minor') ? 'minor-mode' : 'major-mode',
      },
    };
  }

  reset(): void {
    this._scales.clear();
    this._chords = [];
    this._progressions = [];
    this._currentKey = 'C major';
    this._history = [];
    this._counter = 0;
    this._initDefaultScales();
  }

  get scales(): Scale[] {
    return Array.from(this._scales.values());
  }

  get chords(): Chord[] {
    return [...this._chords];
  }

  get progressions(): HarmonyProgression[] {
    return [...this._progressions];
  }

  get currentKey(): string {
    return this._currentKey;
  }

  get history(): HarmonyHistoryEntry[] {
    return [...this._history];
  }

  private _initDefaultScales(): void {
    this.generateScale('C', 'major');
    this.generateScale('A', 'minor');
  }

  private _calculateChordTension(quality: string, inversion: number): number {
    const tensionMap: Record<string, number> = {
      'major': 0.2,
      'minor': 0.25,
      'diminished': 0.9,
      'augmented': 0.8,
      'major7': 0.4,
      'minor7': 0.35,
      'dominant7': 0.7,
      'diminished7': 0.95,
      'half-diminished7': 0.85,
      'minor-major7': 0.6,
      'add9': 0.5,
      'sus4': 0.6,
      'sus2': 0.45,
      '6': 0.35,
      'minor6': 0.4,
    };
    const baseTension = tensionMap[quality] || 0.3;
    const inversionTension = inversion * 0.05;
    return Math.min(1, baseTension + inversionTension);
  }

  private _calculateResolution(quality: string): number {
    const resolutionMap: Record<string, number> = {
      'major': 0.9,
      'minor': 0.8,
      'diminished': 0.1,
      'augmented': 0.2,
      'major7': 0.6,
      'minor7': 0.5,
      'dominant7': 0.95,
      'diminished7': 0.05,
      'half-diminished7': 0.3,
      'minor-major7': 0.4,
      'add9': 0.5,
      'sus4': 0.2,
      'sus2': 0.4,
      '6': 0.7,
      'minor6': 0.6,
    };
    return resolutionMap[quality] || 0.5;
  }

  private _determineChordFunction(root: string, quality: string): string {
    const [keyRoot, keyMode] = this._currentKey.split(' ');
    const keyIndex = NOTE_NAMES.indexOf(keyRoot.toUpperCase());
    const rootIndex = NOTE_NAMES.indexOf(root.toUpperCase());
    if (keyIndex === -1 || rootIndex === -1) return 'unknown';
    const degree = (rootIndex - keyIndex + 12) % 12;
    const functions = FUNCTIONAL_HARMONY[keyMode] || FUNCTIONAL_HARMONY['major'];
    const scaleIntervals = SCALE_INTERVALS[keyMode] || SCALE_INTERVALS['major'];
    const degreeIndex = scaleIntervals.indexOf(degree);
    if (degreeIndex === -1) return 'borrowed';
    return functions[degreeIndex] || 'unknown';
  }

  private _functionToDegree(func: string): number {
    const romanToNum: Record<string, number> = {
      'I': 0, 'ii': 1, 'iii': 2, 'IV': 3, 'V': 4, 'vi': 5, 'viio': 6,
      'i': 0, 'iio': 1, 'III': 2, 'iv': 3, 'VI': 5, 'VII': 6,
    };
    return romanToNum[func] ?? 0;
  }

  private _functionToQuality(func: string, keyMode: string): string {
    const majorQualities: Record<string, string> = {
      'I': 'major', 'ii': 'minor', 'iii': 'minor', 'IV': 'major',
      'V': 'major', 'vi': 'minor', 'viio': 'diminished',
    };
    const minorQualities: Record<string, string> = {
      'i': 'minor', 'iio': 'diminished', 'III': 'major', 'iv': 'minor',
      'V': 'major', 'VI': 'major', 'VII': 'major',
    };
    const qualities = keyMode === 'minor' ? minorQualities : majorQualities;
    return qualities[func] || 'major';
  }

  private _detectCadence(progression: string[]): string {
    if (progression.length < 2) return 'none';
    return this.cadenceDetect(progression);
  }

  private _getCurrentScaleNotes(): number[] {
    const [root, mode] = this._currentKey.split(' ');
    const rootIndex = NOTE_NAMES.indexOf(root.toUpperCase());
    const intervals = SCALE_INTERVALS[mode] || SCALE_INTERVALS['major'];
    return intervals.map(i => (rootIndex + i) % 12);
  }

  private _scaleCharacter(mode: string): string {
    const characters: Record<string, string> = {
      'major': 'bright, triumphant, stable',
      'natural-minor': 'melancholic, gentle, somber',
      'harmonic-minor': 'dramatic, exotic, intense',
      'melodic-minor': 'ascending hopeful, descending somber',
      'dorian': 'jazzy, cool, mysterious',
      'phrygian': 'dark, flamenco, passionate',
      'lydian': 'dreamy, ethereal, bright',
      'mixolydian': 'bluesy, rock, earthy',
      'locrian': 'unstable, dissonant, eerie',
      'pentatonic-major': 'open, folk-like, peaceful',
      'pentatonic-minor': 'soulful, bluesy, introspective',
      'blues': 'gritty, soulful, expressive',
      'chromatic': 'all colors, unrestrained, wild',
    };
    return characters[mode] || 'unique character';
  }

  private _recordHistory(action: string, keyChange: boolean, tensionDelta: number): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      keyChange,
      tensionDelta,
    });
    if (this._history.length > 100) {
      this._history = this._history.slice(-100);
    }
  }
}
