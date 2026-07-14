export interface LeafFragment {
  id: string;
  text: string;
  weight: number;
  scattered: boolean;
}

export interface LeafReading {
  id: string;
  fragments: string[];
  combinedText: string;
  windDirection: number;
  readAt: number;
}

export class SibyllineLeaf {
  private _fragments: Map<string, LeafFragment> = new Map();
  private _readings: LeafReading[] = [];
  private _windStrength = 0.5;
  private _maxFragmentsPerReading = 7;
  private _markovChain: Map<string, Map<string, number>> = new Map();
  private _shannonEntropy: number = 0;

  inscribe(fragment: LeafFragment): void {
    this._fragments.set(fragment.id, fragment);
    this._updateMarkovChain(fragment.text);
  }

  scatter(): LeafFragment[] {
    const scattered: LeafFragment[] = [];
    for (const fragment of this._fragments.values()) {
      if (Math.random() < this._windStrength) {
        fragment.scattered = true;
        scattered.push(fragment);
      } else {
        fragment.scattered = false;
      }
    }
    return scattered;
  }

  private _gatherScattered(count: number): LeafFragment[] {
    const scattered = Array.from(this._fragments.values()).filter((f) => f.scattered);
    const selected: LeafFragment[] = [];
    const pool = [...scattered];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      const totalWeight = pool.reduce((sum, f) => sum + f.weight, 0);
      let r = Math.random() * totalWeight;
      let pickedIndex = 0;
      for (let j = 0; j < pool.length; j++) {
        r -= pool[j].weight;
        if (r <= 0) {
          pickedIndex = j;
          break;
        }
      }
      selected.push(pool[pickedIndex]);
      pool.splice(pickedIndex, 1);
    }
    return selected;
  }

  read(): LeafReading {
    this.scatter();
    const fragments = this._gatherScattered(this._maxFragmentsPerReading);
    const fragmentIds = fragments.map((f) => f.id);
    const combinedText = fragments.map((f) => f.text).join(' ');
    const reading: LeafReading = {
      id: `reading-${Date.now()}`,
      fragments: fragmentIds,
      combinedText,
      windDirection: Math.floor(Math.random() * 360),
      readAt: Date.now(),
    };
    this._readings.push(reading);
    if (this._readings.length > 200) this._readings.shift();
    this._shannonEntropy = this._computeTextEntropy(combinedText);
    return reading;
  }

  interpretReading(readingId: string): string[] {
    const reading = this._readings.find((r) => r.id === readingId);
    if (!reading) return [];
    const interpretations: string[] = [];
    const words = reading.combinedText.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const prob = this._markovProbability(words[i], words[i + 1] ?? '');
      interpretations.push(`位置${i + 1}: ${words[i]} → 概率${prob.toFixed(3)}`);
    }
    return interpretations;
  }

  computeMutualInformation(textA: string, textB: string): number {
    const freqA: Record<string, number> = {};
    const freqB: Record<string, number> = {};
    const joint: Record<string, number> = {};
    const wordsA = textA.split(/\s+/);
    const wordsB = textB.split(/\s+/);
    const minLen = Math.min(wordsA.length, wordsB.length);
    for (let i = 0; i < minLen; i++) {
      freqA[wordsA[i]] = (freqA[wordsA[i]] ?? 0) + 1;
      freqB[wordsB[i]] = (freqB[wordsB[i]] ?? 0) + 1;
      const key = `${wordsA[i]}|${wordsB[i]}`;
      joint[key] = (joint[key] ?? 0) + 1;
    }
    let mi = 0;
    for (const [key, count] of Object.entries(joint)) {
      const [wa, wb] = key.split('|');
      const pJoint = count / minLen;
      const pA = (freqA[wa] ?? 1) / minLen;
      const pB = (freqB[wb] ?? 1) / minLen;
      mi += pJoint * Math.log2(pJoint / (pA * pB));
    }
    return mi;
  }

  generateMarkovSequence(length: number): string {
    const states = Array.from(this._markovChain.keys());
    if (states.length === 0) return '';
    let current = states[Math.floor(Math.random() * states.length)];
    const result: string[] = [current];
    for (let i = 1; i < length; i++) {
      const transitions = this._markovChain.get(current);
      if (!transitions || transitions.size === 0) break;
      const total = Array.from(transitions.values()).reduce((s, v) => s + v, 0);
      let roll = Math.random() * total;
      let next = current;
      for (const [word, weight] of transitions) {
        roll -= weight;
        if (roll <= 0) {
          next = word;
          break;
        }
      }
      result.push(next);
      current = next;
    }
    return result.join(' ');
  }

  setWindStrength(value: number): void {
    this._windStrength = Math.max(0, Math.min(1, value));
  }

  setMaxFragments(value: number): void {
    this._maxFragmentsPerReading = Math.max(1, value);
  }

  collectLeaves(): number {
    let collected = 0;
    for (const fragment of this._fragments.values()) {
      if (fragment.scattered) {
        fragment.scattered = false;
        collected++;
      }
    }
    return collected;
  }

  getFragment(id: string): LeafFragment | null {
    return this._fragments.get(id) ?? null;
  }

  getReadings(limit: number = 20): LeafReading[] {
    return this._readings.slice(-limit);
  }

  get fragmentCount(): number {
    return this._fragments.size;
  }

  get readingCount(): number {
    return this._readings.length;
  }

  get currentEntropy(): number {
    return this._shannonEntropy;
  }

  private _updateMarkovChain(text: string): void {
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const current = words[i];
      const next = words[i + 1];
      if (!this._markovChain.has(current)) {
        this._markovChain.set(current, new Map());
      }
      const transitions = this._markovChain.get(current)!;
      transitions.set(next, (transitions.get(next) ?? 0) + 1);
    }
  }

  private _markovProbability(from: string, to: string): number {
    const transitions = this._markovChain.get(from);
    if (!transitions || transitions.size === 0) return 0;
    const total = Array.from(transitions.values()).reduce((s, v) => s + v, 0);
    return (transitions.get(to) ?? 0) / total;
  }

  private _computeTextEntropy(text: string): number {
    const words = text.split(/\s+/);
    if (words.length === 0) return 0;
    const freq: Record<string, number> = {};
    for (const w of words) freq[w] = (freq[w] ?? 0) + 1;
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / words.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
