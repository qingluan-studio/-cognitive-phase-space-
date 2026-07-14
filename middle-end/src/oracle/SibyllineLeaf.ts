/**
 * 西比拉之叶模块：将预言写在碎片上，随风散落，
 * 通过解读碎片的随机排列组合得到预言含义。
 */

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

  inscribe(fragment: LeafFragment): void {
    this._fragments.set(fragment.id, fragment);
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
    const scattered = Array.from(this._fragments.values()).filter(f => f.scattered);
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
    const fragmentIds = fragments.map(f => f.id);
    const combinedText = fragments.map(f => f.text).join(' ');
    const reading: LeafReading = {
      id: `reading-${Date.now()}`,
      fragments: fragmentIds,
      combinedText,
      windDirection: Math.floor(Math.random() * 360),
      readAt: Date.now(),
    };
    this._readings.push(reading);
    if (this._readings.length > 200) this._readings.shift();
    return reading;
  }

  interpretReading(readingId: string): string[] {
    const reading = this._readings.find(r => r.id === readingId);
    if (!reading) return [];
    const interpretations: string[] = [];
    const words = reading.combinedText.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      interpretations.push(`位置${i + 1}: ${words[i]} → 含义${(i % 4) + 1}`);
    }
    return interpretations;
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
}
