export interface GrammaticalItem {
  form: string;
  semanticWeight: number;
  phoneticErosion: number;
  frequency: number;
  syntacticScope: number;
  bondedness: number;
}

export interface GrammaticalizationPath {
  stage: number;
  item: GrammaticalItem;
  mechanism: string;
}

export class Grammaticalization {
  private _items: Map<string, GrammaticalItem>;
  private _paths: Map<string, GrammaticalizationPath[]>;
  private _history: { stage: number; meanErosion: number; meanBondedness: number }[];
  private _currentStage: number;

  constructor() {
    this._items = new Map();
    this._paths = new Map();
    this._history = [];
    this._currentStage = 0;
  }

  get itemCount(): number { return this._items.size; }
  get currentStage(): number { return this._currentStage; }
  get history(): { stage: number; meanErosion: number; meanBondedness: number }[] { return this._history; }

  public addItem(form: string, semanticWeight: number, frequency: number = 1): void {
    this._items.set(form, {
      form,
      semanticWeight,
      phoneticErosion: 0,
      frequency,
      syntacticScope: 1.0,
      bondedness: 0
    });
  }

  public applyErosion(form: string, amount: number): void {
    const item = this._items.get(form);
    if (item) {
      item.phoneticErosion = Math.min(1.0, item.phoneticErosion + amount);
      item.form = item.form.slice(0, Math.max(1, Math.floor(item.form.length * (1 - item.phoneticErosion))));
    }
  }

  public applySemanticBleaching(form: string, amount: number): void {
    const item = this._items.get(form);
    if (item) {
      item.semanticWeight = Math.max(0, item.semanticWeight - amount);
    }
  }

  public increaseBondedness(form: string, amount: number): void {
    const item = this._items.get(form);
    if (item) {
      item.bondedness = Math.min(1.0, item.bondedness + amount);
    }
  }

  public expandScope(form: string, factor: number): void {
    const item = this._items.get(form);
    if (item) {
      item.syntacticScope *= factor;
    }
  }

  public step(): void {
    this._currentStage++;
    for (const [form, item] of this._items) {
      if (item.frequency > 50) {
        this.applyErosion(form, 0.02);
        this.applySemanticBleaching(form, 0.03);
        this.increaseBondedness(form, 0.01);
      }
      if (item.semanticWeight < 0.3 && item.bondedness > 0.5) {
        this.expandScope(form, 1.1);
      }
      item.frequency = Math.floor(item.frequency * (0.95 + Math.random() * 0.1));
    }
    this._recordState();
  }

  public evolve(stages: number): void {
    for (let i = 0; i < stages; i++) {
      this.step();
    }
  }

  public computeGrammaticalizationIndex(form: string): number {
    const item = this._items.get(form);
    if (!item) return 0;
    return (item.phoneticErosion + (1 - item.semanticWeight) + item.bondedness) / 3;
  }

  public findGrammaticalizedItems(threshold: number = 0.5): GrammaticalItem[] {
    return Array.from(this._items.values())
      .filter(item => this.computeGrammaticalizationIndex(item.form) >= threshold)
      .map(item => ({ ...item }));
  }

  public trackPath(form: string): GrammaticalizationPath[] {
    return this._paths.get(form) || [];
  }

  public recordPathStage(form: string, mechanism: string): void {
    const item = this._items.get(form);
    if (!item) return;
    const path = this._paths.get(form) || [];
    path.push({ stage: this._currentStage, item: { ...item }, mechanism });
    this._paths.set(form, path);
  }

  public reconstructProtoForm(form: string): string {
    const item = this._items.get(form);
    if (!item) return '';
    const path = this._paths.get(form);
    if (path && path.length > 0) {
      return path[0].item.form;
    }
    return form;
  }

  public compareStages(formA: string, formB: string): number {
    const idxA = this.computeGrammaticalizationIndex(formA);
    const idxB = this.computeGrammaticalizationIndex(formB);
    return idxA - idxB;
  }

  public computeTypologicalCycle(): { unbound: number; clitic: number; affix: number; fused: number } {
    const counts = { unbound: 0, clitic: 0, affix: 0, fused: 0 };
    for (const item of this._items.values()) {
      if (item.bondedness < 0.25) counts.unbound++;
      else if (item.bondedness < 0.5) counts.clitic++;
      else if (item.bondedness < 0.75) counts.affix++;
      else counts.fused++;
    }
    return counts;
  }

  private _recordState(): void {
    const items = Array.from(this._items.values());
    const meanErosion = items.reduce((sum, i) => sum + i.phoneticErosion, 0) / items.length;
    const meanBondedness = items.reduce((sum, i) => sum + i.bondedness, 0) / items.length;
    this._history.push({ stage: this._currentStage, meanErosion, meanBondedness });
  }

  public reset(): void {
    this._items.clear();
    this._paths.clear();
    this._history = [];
    this._currentStage = 0;
  }

  public exportItems(): GrammaticalItem[] {
    return Array.from(this._items.values()).map(item => ({ ...item }));
  }
}
