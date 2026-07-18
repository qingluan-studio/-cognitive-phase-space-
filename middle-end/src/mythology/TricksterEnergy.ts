import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface Trick {
  id: string;
  name: string;
  target: string;
  type: 'wordplay' | 'transformation' | 'inversion' | 'paradox' | 'chaos';
  success: boolean;
  wisdom: string;
  timestamp: number;
}

export interface ParadoxToy {
  id: string;
  statement: string;
  resolution: string;
  tensionLevel: number;
  truthValue: 'both' | 'neither' | 'oscillating' | 'transcendent';
  enlightenment: number;
}

export interface Inversion {
  id: string;
  originalConcept: string;
  invertedConcept: string;
  insight: string;
  reversalPower: number;
}

interface TricksterHistory {
  timestamp: number;
  action: string;
  chaosDelta: number;
  laughterEnergyDelta: number;
}

const WISDOM_FROM_CHAOS_THRESHOLD = 0.7;
const MAX_TRICKS = 50;
const MAX_PARADOXES = 20;
const MAX_INVERSIONS = 30;

export class TricksterEnergy {
  private _tricks: Trick[] = [];
  private _paradoxToys: ParadoxToy[] = [];
  private _inversions: Inversion[] = [];
  private _chaosLevel: number = 0.5;
  private _history: TricksterHistory[] = [];
  private _laughterEnergy: number = 0.3;
  private _counter = 0;

  constructor() {
    this._seedInitialTricks();
  }

  playTrick(target: string): Trick {
    const trickTypes: Trick['type'][] = ['wordplay', 'transformation', 'inversion', 'paradox', 'chaos'];
    const type = trickTypes[Math.floor(Math.random() * trickTypes.length)];
    const wisdom = this._trickWisdom(type);
    const success = Math.random() > 0.2;
    const trick: Trick = {
      id: `trick-${(++this._counter).toString(36)}`,
      name: this._trickName(type),
      target,
      type,
      success,
      wisdom,
      timestamp: Date.now(),
    };
    this._tricks.push(trick);
    if (this._tricks.length > MAX_TRICKS) {
      this._tricks = this._tricks.slice(-MAX_TRICKS);
    }
    const chaosDelta = success ? 0.1 : -0.05;
    const laughterDelta = success ? 0.15 : 0.05;
    this._chaosLevel = Math.max(0, Math.min(1, this._chaosLevel + chaosDelta));
    this._laughterEnergy = Math.max(0, Math.min(1, this._laughterEnergy + laughterDelta));
    this._recordHistory('play-trick', chaosDelta, laughterDelta);
    return { ...trick };
  }

  createParadox(statement?: string): ParadoxToy {
    const paradoxStatements = [
      'The more you try to control, the more things slip away.',
      'I know that I know nothing, yet this knowing is everything.',
      'The journey is the destination, but you must keep moving.',
      'True strength lies in vulnerability.',
      'The map is not the territory, yet the territory exists only through the map.',
      'To find yourself, you must first lose yourself completely.',
      'The loudest silence speaks the deepest truth.',
      'We become what we resist the most.',
    ];
    const stmt = statement || paradoxStatements[Math.floor(Math.random() * paradoxStatements.length)];
    const truthValues: ParadoxToy['truthValue'][] = ['both', 'neither', 'oscillating', 'transcendent'];
    const truthValue = truthValues[Math.floor(Math.random() * truthValues.length)];
    const tensionLevel = 0.4 + Math.random() * 0.6;
    const enlightenment = this._paradoxEnlightenment(tensionLevel, truthValue);
    const paradox: ParadoxToy = {
      id: `paradox-${(++this._counter).toString(36)}`,
      statement: stmt,
      resolution: this._paradoxResolution(stmt, truthValue),
      tensionLevel,
      truthValue,
      enlightenment,
    };
    this._paradoxToys.push(paradox);
    if (this._paradoxToys.length > MAX_PARADOXES) {
      this._paradoxToys = this._paradoxToys.slice(-MAX_PARADOXES);
    }
    this._chaosLevel = Math.min(1, this._chaosLevel + 0.08);
    this._laughterEnergy = Math.min(1, this._laughterEnergy + 0.05);
    this._recordHistory('create-paradox', 0.08, 0.05);
    return { ...paradox };
  }

  invert(concept: string): Inversion {
    const inverted = this._invertConcept(concept);
    const insight = this._inversionInsight(concept, inverted);
    const reversalPower = Math.min(1, 0.3 + Math.random() * 0.7);
    const inversion: Inversion = {
      id: `invert-${(++this._counter).toString(36)}`,
      originalConcept: concept,
      invertedConcept: inverted,
      insight,
      reversalPower,
    };
    this._inversions.push(inversion);
    if (this._inversions.length > MAX_INVERSIONS) {
      this._inversions = this._inversions.slice(-MAX_INVERSIONS);
    }
    this._chaosLevel = Math.min(1, this._chaosLevel + reversalPower * 0.1);
    this._recordHistory('invert', reversalPower * 0.1, 0.03);
    return { ...inversion };
  }

  crossDressPerspective(perspectiveA: string, perspectiveB: string): { synthesis: string; depth: number } {
    const wordsA = perspectiveA.split(/\s+/);
    const wordsB = perspectiveB.split(/\s+/);
    const shuffled = [...wordsA, ...wordsB].sort(() => Math.random() - 0.5);
    const synthesis = shuffled.slice(0, Math.ceil(shuffled.length * 0.7)).join(' ');
    const depth = Math.min(1, 0.4 + Math.random() * 0.6 + this._laughterEnergy * 0.2);
    this._chaosLevel = Math.min(1, this._chaosLevel + 0.06);
    this._recordHistory('cross-dress-perspective', 0.06, 0.08);
    return { synthesis, depth };
  }

  breakRitual(ritualName: string): { liberation: number; insight: string } {
    const liberation = Math.min(1, 0.2 + Math.random() * 0.6 + this._chaosLevel * 0.2);
    const insights = [
      'Rituals are containers, but the spirit cannot be contained.',
      'The form is a door, not the destination.',
      'Breaking habit reveals the essence beneath.',
      'The sacred is found in the unexpected.',
      'Freedom comes from questioning every should.',
    ];
    const insight = insights[Math.floor(Math.random() * insights.length)];
    this._chaosLevel = Math.min(1, this._chaosLevel + liberation * 0.15);
    this._laughterEnergy = Math.min(1, this._laughterEnergy + 0.12);
    this._recordHistory('break-ritual', liberation * 0.15, 0.12);
    return { liberation, insight };
  }

  holyFool(question: string): { answer: string; wisdom: number } {
    const foolishAnswers = [
      'The answer is the question, wearing a different hat.',
      'Go ask the wind. It has been everywhere and remembers nothing.',
      'You already know. The knowing is just hiding from itself.',
      'Turn the question inside out and shake it. Truth falls out like pocket lint.',
      'The fool knows everything, but speaks in riddles. This is not a riddle.',
      'Walk backwards for three days and you will arrive exactly where you started, but different.',
      'Silence is the loudest answer. You are just not listening hard enough.',
    ];
    const answer = foolishAnswers[Math.floor(Math.random() * foolishAnswers.length)];
    const wisdom = Math.min(1, 0.5 + Math.random() * 0.5 + this._chaosLevel * 0.1);
    this._laughterEnergy = Math.min(1, this._laughterEnergy + 0.1);
    this._recordHistory('holy-fool', 0.02, 0.1);
    return { answer, wisdom };
  }

  getChaosLevel(): number {
    return this._chaosLevel;
  }

  wisdomFromChaos(): string {
    if (this._chaosLevel < WISDOM_FROM_CHAOS_THRESHOLD) {
      return 'Chaos is still brewing. More disruption needed before wisdom crystallizes.';
    }
    const wisdom = [
      'In the heart of chaos, order dances its primal dance.',
      'The trickster laughs not at you, but with the absurdity of being.',
      'Every inversion reveals a truth hidden in plain sight.',
      'Paradox is the loom on which reality weaves itself.',
      'What you resist persists. What you embrace transforms.',
      'The fool is the only one who truly sees, because nothing is at stake.',
      'Chaos is merely order waiting to be understood from a different angle.',
    ];
    const selected = wisdom[Math.floor(Math.random() * wisdom.length)];
    this._laughterEnergy = Math.min(1, this._laughterEnergy + 0.05);
    this._recordHistory('wisdom-from-chaos', -0.1, 0.05);
    this._chaosLevel = Math.max(0, this._chaosLevel - 0.1);
    return selected;
  }

  toPacket(): DataPacket {
    return {
      id: `trickster-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        tricks: [...this._tricks],
        paradoxToys: [...this._paradoxToys],
        inversions: [...this._inversions],
        chaosLevel: this._chaosLevel,
        laughterEnergy: this._laughterEnergy,
        latestWisdom: this.wisdomFromChaos(),
      },
      metadata: {
        createdAt: Date.now(),
        route: ['TricksterEnergy'],
        priority: Math.max(1, Math.floor(this._chaosLevel * 10)),
        phase: this._chaosLevel > 0.7 ? 'chaos-reigns' : 'playful-mischief',
      },
    };
  }

  reset(): void {
    this._tricks = [];
    this._paradoxToys = [];
    this._inversions = [];
    this._chaosLevel = 0.5;
    this._history = [];
    this._laughterEnergy = 0.3;
    this._counter = 0;
    this._seedInitialTricks();
  }

  get tricks(): Trick[] {
    return [...this._tricks];
  }

  get paradoxToys(): ParadoxToy[] {
    return [...this._paradoxToys];
  }

  get inversions(): Inversion[] {
    return [...this._inversions];
  }

  get chaosLevel(): number {
    return this._chaosLevel;
  }

  get laughterEnergy(): number {
    return this._laughterEnergy;
  }

  get history(): TricksterHistory[] {
    return [...this._history];
  }

  private _seedInitialTricks(): void {
    const initialTargets = ['ego', 'routine', 'certainty', 'gravity', 'time'];
    initialTargets.forEach(target => {
      this.playTrick(target);
    });
  }

  private _trickName(type: Trick['type']): string {
    const names: Record<Trick['type'], string[]> = {
      wordplay: ['Pun-derful Surprise', 'Double Meaning Detour', 'Etymological Hijack'],
      transformation: ['Shape-shift Shenanigan', 'Form Flipper', 'Identity Swap'],
      inversion: ['Upside-down Day', 'Reverse Psychology', 'Mirror Mirror'],
      paradox: ['Catch-22 Caper', 'Zen Koan Prank', 'Liars Paradox Party'],
      chaos: ['Random Insertion', 'Butterfly Effect', 'Entropy Party'],
    };
    const options = names[type];
    return options[Math.floor(Math.random() * options.length)];
  }

  private _trickWisdom(type: Trick['type']): string {
    const wisdom: Record<Trick['type'], string> = {
      wordplay: 'Language is a game. Seriousness is optional.',
      transformation: 'Everything is fluid. Form is a snapshot, not a sentence.',
      inversion: 'The opposite of a great truth is also a great truth.',
      paradox: 'Reality is fundamentally contradictory. Embrace the tension.',
      chaos: 'Order is a temporary agreement. Chaos is the default state.',
    };
    return wisdom[type];
  }

  private _invertConcept(concept: string): string {
    const opposites: Record<string, string> = {
      'good': 'evil',
      'evil': 'good',
      'up': 'down',
      'down': 'up',
      'inside': 'outside',
      'outside': 'inside',
      'beginning': 'end',
      'end': 'beginning',
      'life': 'death',
      'death': 'life',
      'order': 'chaos',
      'chaos': 'order',
      'wisdom': 'folly',
      'folly': 'wisdom',
      'strength': 'vulnerability',
      'vulnerability': 'strength',
      'freedom': 'bondage',
      'bondage': 'freedom',
      'truth': 'illusion',
      'illusion': 'truth',
    };
    return opposites[concept.toLowerCase()] || `un-${concept}`;
  }

  private _inversionInsight(original: string, inverted: string): string {
    const templates = [
      `When ${original} meets ${inverted}, the boundary between them dissolves into something new.`,
      `${inverted} is not the opposite of ${original}, but its secret complement.`,
      `Understanding ${inverted} reveals the hidden face of ${original}.`,
      `${original} and ${inverted} dance together, each creating the other.`,
      `The tension between ${original} and ${inverted} is where growth happens.`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private _paradoxEnlightenment(tension: number, truthValue: ParadoxToy['truthValue']): number {
    const valueMultipliers: Record<ParadoxToy['truthValue'], number> = {
      'both': 0.8,
      'neither': 0.7,
      'oscillating': 0.85,
      'transcendent': 1.0,
    };
    return Math.min(1, tension * valueMultipliers[truthValue]);
  }

  private _paradoxResolution(statement: string, truthValue: ParadoxToy['truthValue']): string {
    const resolutions: Record<ParadoxToy['truthValue'], string> = {
      'both': 'Both perspectives are true simultaneously, from different angles.',
      'neither': 'Neither perspective captures the whole truth. Both are partial.',
      'oscillating': 'The truth oscillates between poles, never settling on one.',
      'transcendent': 'The paradox points to a truth beyond both poles, in a higher dimension.',
    };
    return resolutions[truthValue];
  }

  private _recordHistory(action: string, chaosDelta: number, laughterEnergyDelta: number): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      chaosDelta,
      laughterEnergyDelta,
    });
    if (this._history.length > 100) {
      this._history = this._history.slice(-100);
    }
  }
}
