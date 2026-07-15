export interface Lexeme {
  form: string;
  meaning: number[];
  frequency: number;
  age: number;
}

export interface LanguageState {
  generation: number;
  lexemeCount: number;
  meanWordLength: number;
  synonymy: number;
}

export class LexicalEvolution {
  private _lexicon: Map<string, Lexeme>;
  private _phonemes: string[];
  private _mutationRate: number;
  private _driftRate: number;
  private _history: LanguageState[];
  private _generation: number;

  constructor(phonemes: string[], mutationRate: number = 0.1, driftRate: number = 0.05) {
    this._phonemes = phonemes;
    this._mutationRate = mutationRate;
    this._driftRate = driftRate;
    this._lexicon = new Map();
    this._history = [];
    this._generation = 0;
  }

  get lexiconSize(): number { return this._lexicon.size; }
  get generation(): number { return this._generation; }
  get history(): LanguageState[] { return this._history; }

  public addLexeme(form: string, meaning: number[], frequency: number = 1): void {
    this._lexicon.set(form, { form, meaning: [...meaning], frequency, age: 0 });
  }

  public mutateForm(form: string): string {
    const chars = form.split('');
    if (Math.random() < this._mutationRate && chars.length > 1) {
      const idx = Math.floor(Math.random() * chars.length);
      chars[idx] = this._phonemes[Math.floor(Math.random() * this._phonemes.length)];
    }
    if (Math.random() < this._mutationRate / 2) {
      chars.push(this._phonemes[Math.floor(Math.random() * this._phonemes.length)]);
    }
    return chars.join('');
  }

  public driftMeaning(meaning: number[]): number[] {
    return meaning.map(v => v + (Math.random() - 0.5) * this._driftRate);
  }

  public step(): void {
    this._generation++;
    const newLexicon = new Map<string, Lexeme>();
    for (const [form, lexeme] of this._lexicon) {
      const newForm = this.mutateForm(form);
      const newMeaning = this.driftMeaning(lexeme.meaning);
      const newFreq = lexeme.frequency * (0.95 + Math.random() * 0.1);
      newLexicon.set(newForm, {
        form: newForm,
        meaning: newMeaning,
        frequency: newFreq,
        age: lexeme.age + 1
      });
    }
    this._lexicon = newLexicon;
    this._recordState();
  }

  public evolve(generations: number): void {
    for (let i = 0; i < generations; i++) {
      this.step();
    }
  }

  public computeCognateDistance(formA: string, formB: string): number {
    const len = Math.max(formA.length, formB.length);
    let dist = 0;
    for (let i = 0; i < len; i++) {
      if (formA[i] !== formB[i]) dist++;
    }
    return dist / len;
  }

  public computeSemanticDistance(meaningA: number[], meaningB: number[]): number {
    let dist = 0;
    for (let i = 0; i < meaningA.length; i++) {
      dist += (meaningA[i] - meaningB[i]) ** 2;
    }
    return Math.sqrt(dist);
  }

  public findCognates(threshold: number = 0.3): { a: string; b: string; distance: number }[] {
    const cognates: { a: string; b: string; distance: number }[] = [];
    const forms = Array.from(this._lexicon.keys());
    for (let i = 0; i < forms.length; i++) {
      for (let j = i + 1; j < forms.length; j++) {
        const dist = this.computeCognateDistance(forms[i], forms[j]);
        if (dist < threshold) {
          cognates.push({ a: forms[i], b: forms[j], distance: dist });
        }
      }
    }
    return cognates;
  }

  public computeSynonymy(): number {
    const meanings = Array.from(this._lexicon.values()).map(l => l.meaning);
    let totalDist = 0;
    let pairs = 0;
    for (let i = 0; i < meanings.length; i++) {
      for (let j = i + 1; j < meanings.length; j++) {
        totalDist += this.computeSemanticDistance(meanings[i], meanings[j]);
        pairs++;
      }
    }
    return pairs > 0 ? 1 - totalDist / pairs : 0;
  }

  public computeMeanWordLength(): number {
    const forms = Array.from(this._lexicon.keys());
    if (forms.length === 0) return 0;
    return forms.reduce((sum, f) => sum + f.length, 0) / forms.length;
  }

  public computeZipfDistribution(): Map<string, number> {
    const sorted = Array.from(this._lexicon.values()).sort((a, b) => b.frequency - a.frequency);
    const dist = new Map<string, number>();
    for (let i = 0; i < sorted.length; i++) {
      const rank = i + 1;
      dist.set(sorted[i].form, sorted[i].frequency / rank);
    }
    return dist;
  }

  public simulateLanguageSplit(): LexicalEvolution {
    const child = new LexicalEvolution(this._phonemes, this._mutationRate * 1.5, this._driftRate * 1.5);
    for (const [form, lexeme] of this._lexicon) {
      child.addLexeme(form, lexeme.meaning, lexeme.frequency);
    }
    return child;
  }

  private _recordState(): void {
    this._history.push({
      generation: this._generation,
      lexemeCount: this._lexicon.size,
      meanWordLength: this.computeMeanWordLength(),
      synonymy: this.computeSynonymy()
    });
  }

  public reset(): void {
    this._lexicon.clear();
    this._history = [];
    this._generation = 0;
  }

  public exportLexicon(): Lexeme[] {
    return Array.from(this._lexicon.values()).map(l => ({ ...l, meaning: [...l.meaning] }));
  }
}
