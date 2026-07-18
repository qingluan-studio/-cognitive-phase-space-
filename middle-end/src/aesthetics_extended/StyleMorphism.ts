import { DataPacket, KnowledgeUnit, Signal } from '../shared/types';

export interface Style {
  id: string;
  name: string;
  features: number[];
  weight: number;
  parentage: string[];
  birthGeneration: number;
  dominance: number;
}

export interface StyleEvolutionState {
  generation: number;
  population: Style[];
  diversity: number;
  averageFitness: number;
  dominantStyle: string | null;
  timestamp: number;
}

export interface MorphismResult {
  childStyle: Style;
  parentA: string;
  parentB: string;
  innovation: number;
  coherence: number;
}

export interface StyleEcologicalNiche {
  name: string;
  featurePreferences: number[];
  carryingCapacity: number;
  currentPopulation: number;
}

export class StyleMorphism {
  private _styles: Map<string, Style>;
  private _featureDimensions: number;
  private _mutationRate: number;
  private _crossoverRate: number;
  private _history: StyleEvolutionState[];
  private _generation: number;
  private _niches: StyleEcologicalNiche[];
  private _selectionPressure: number;
  private _innovationBias: number;

  constructor(featureDimensions: number = 8) {
    this._styles = new Map();
    this._featureDimensions = featureDimensions;
    this._mutationRate = 0.1;
    this._crossoverRate = 0.7;
    this._history = [];
    this._generation = 0;
    this._niches = [];
    this._selectionPressure = 0.3;
    this._innovationBias = 0.2;
  }

  get styleCount(): number { return this._styles.size; }
  get featureDimensions(): number { return this._featureDimensions; }
  get mutationRate(): number { return this._mutationRate; }
  get crossoverRate(): number { return this._crossoverRate; }
  get selectionPressure(): number { return this._selectionPressure; }
  get innovationBias(): number { return this._innovationBias; }
  get currentGeneration(): number { return this._generation; }

  public setMutationRate(rate: number): void {
    this._mutationRate = Math.max(0, Math.min(1, rate));
  }

  public setCrossoverRate(rate: number): void {
    this._crossoverRate = Math.max(0, Math.min(1, rate));
  }

  public setSelectionPressure(pressure: number): void {
    this._selectionPressure = Math.max(0, Math.min(1, pressure));
  }

  public setInnovationBias(bias: number): void {
    this._innovationBias = Math.max(0, Math.min(1, bias));
  }

  public addStyle(style: Omit<Style, 'birthGeneration'>): void {
    this._styles.set(style.id, {
      ...style,
      birthGeneration: this._generation
    });
  }

  public createRandomStyle(id: string, name: string): Style {
    const features: number[] = [];
    for (let i = 0; i < this._featureDimensions; i++) {
      features.push(Math.random());
    }
    const style: Style = {
      id,
      name,
      features,
      weight: 1,
      parentage: [],
      birthGeneration: this._generation,
      dominance: 0.5
    };
    this._styles.set(id, style);
    return style;
  }

  public getStyle(id: string): Style | undefined {
    const s = this._styles.get(id);
    return s ? { ...s, features: [...s.features], parentage: [...s.parentage] } : undefined;
  }

  public removeStyle(id: string): boolean {
    return this._styles.delete(id);
  }

  public addNiche(niche: StyleEcologicalNiche): void {
    this._niches.push({ ...niche, featurePreferences: [...niche.featurePreferences] });
  }

  public styleDistance(styleA: string, styleB: string): number {
    const a = this._styles.get(styleA);
    const b = this._styles.get(styleB);
    if (!a || !b) return Infinity;

    let dist = 0;
    for (let i = 0; i < this._featureDimensions; i++) {
      dist += (a.features[i] - b.features[i]) ** 2;
    }
    return Math.sqrt(dist / this._featureDimensions);
  }

  public styleSimilarity(styleA: string, styleB: string): number {
    return 1 - this.styleDistance(styleA, styleB);
  }

  public crossover(parentIdA: string, parentIdB: string, childId: string, childName: string): MorphismResult | null {
    const parentA = this._styles.get(parentIdA);
    const parentB = this._styles.get(parentIdB);
    if (!parentA || !parentB) return null;

    if (Math.random() > this._crossoverRate) {
      return {
        childStyle: { ...parentA, id: childId, name: childName },
        parentA: parentIdA,
        parentB: parentIdB,
        innovation: 0,
        coherence: 1
      };
    }

    const childFeatures: number[] = [];
    let innovation = 0;

    for (let i = 0; i < this._featureDimensions; i++) {
      let gene: number;
      if (Math.random() < 0.5) {
        gene = parentA.features[i];
      } else {
        gene = parentB.features[i];
      }

      if (Math.random() < this._mutationRate) {
        const mutation = (Math.random() * 2 - 1) * 0.3;
        gene = Math.max(0, Math.min(1, gene + mutation));
        innovation += Math.abs(mutation);
      }

      childFeatures.push(gene);
    }

    const coherence = this._calculateCoherence(childFeatures);
    const avgDominance = (parentA.dominance + parentB.dominance) / 2;

    const childStyle: Style = {
      id: childId,
      name: childName,
      features: childFeatures,
      weight: 1,
      parentage: [parentIdA, parentIdB],
      birthGeneration: this._generation,
      dominance: avgDominance * (1 + this._innovationBias * innovation)
    };

    this._styles.set(childId, childStyle);

    return {
      childStyle: { ...childStyle, features: [...childFeatures], parentage: [parentIdA, parentIdB] },
      parentA: parentIdA,
      parentB: parentIdB,
      innovation: innovation / this._featureDimensions,
      coherence
    };
  }

  private _calculateCoherence(features: number[]): number {
    let sum = 0;
    let sumSq = 0;
    for (const f of features) {
      sum += f;
      sumSq += f * f;
    }
    const mean = sum / features.length;
    const variance = sumSq / features.length - mean * mean;
    return 1 - Math.min(1, Math.sqrt(Math.max(0, variance)) * 2);
  }

  public calculateFitness(styleId: string): number {
    const style = this._styles.get(styleId);
    if (!style) return 0;

    let fitness = 0;

    if (this._niches.length > 0) {
      let bestNicheFitness = 0;
      for (const niche of this._niches) {
        let nicheMatch = 0;
        for (let i = 0; i < this._featureDimensions && i < niche.featurePreferences.length; i++) {
          nicheMatch += 1 - Math.abs(style.features[i] - niche.featurePreferences[i]);
        }
        nicheMatch /= this._featureDimensions;
        if (nicheMatch > bestNicheFitness) {
          bestNicheFitness = nicheMatch;
        }
      }
      fitness += bestNicheFitness * 0.6;
    }

    const coherence = this._calculateCoherence(style.features);
    fitness += coherence * 0.2;

    fitness += style.dominance * 0.2;

    return Math.max(0, Math.min(1, fitness));
  }

  public evolveStep(): StyleEvolutionState {
    this._generation++;

    const styleList = Array.from(this._styles.values());
    if (styleList.length < 2) {
      return this._recordState();
    }

    const fitnesses = styleList.map(s => this.calculateFitness(s.id));
    const totalFitness = fitnesses.reduce((a, b) => a + b, 0);

    const survivors: Style[] = [];
    for (let i = 0; i < styleList.length; i++) {
      const survivalProb = totalFitness > 0
        ? fitnesses[i] / totalFitness * (1 - this._selectionPressure) + this._selectionPressure
        : 0.5;
      if (Math.random() < survivalProb) {
        survivors.push(styleList[i]);
      }
    }

    if (survivors.length < 2) {
      styleList.sort((a, b) => this.calculateFitness(b.id) - this.calculateFitness(a.id));
      survivors.push(...styleList.slice(0, 2));
    }

    const newStyles = new Map<string, Style>();
    for (const s of survivors) {
      newStyles.set(s.id, s);
    }

    const targetCount = Math.max(10, Math.floor(styleList.length * 1.2));
    let newIdCounter = 0;
    while (newStyles.size < targetCount && survivors.length >= 2) {
      const parentA = survivors[Math.floor(Math.random() * survivors.length)];
      let parentB = survivors[Math.floor(Math.random() * survivors.length)];
      while (parentB.id === parentA.id && survivors.length > 1) {
        parentB = survivors[Math.floor(Math.random() * survivors.length)];
      }
      if (parentB.id === parentA.id) break;

      const childId = `style-${this._generation}-${newIdCounter++}`;
      const result = this.crossover(parentA.id, parentB.id, childId, `Hybrid ${childId}`);
      if (result) {
        newStyles.set(childId, result.childStyle);
      }
    }

    this._styles = newStyles;
    return this._recordState();
  }

  private _recordState(): StyleEvolutionState {
    const allStyles = Array.from(this._styles.values());
    const diversity = this._calculateDiversity();
    const avgFitness = allStyles.length > 0
      ? allStyles.reduce((s, style) => s + this.calculateFitness(style.id), 0) / allStyles.length
      : 0;

    let dominantStyle: string | null = null;
    let maxDominance = 0;
    for (const style of allStyles) {
      if (style.dominance > maxDominance) {
        maxDominance = style.dominance;
        dominantStyle = style.id;
      }
    }

    const state: StyleEvolutionState = {
      generation: this._generation,
      population: allStyles.map(s => ({ ...s, features: [...s.features], parentage: [...s.parentage] })),
      diversity,
      averageFitness: avgFitness,
      dominantStyle,
      timestamp: this._generation
    };

    this._history.push(state);
    return state;
  }

  private _calculateDiversity(): number {
    const styles = Array.from(this._styles.values());
    if (styles.length < 2) return 0;

    let totalDist = 0;
    let pairCount = 0;
    for (let i = 0; i < styles.length; i++) {
      for (let j = i + 1; j < styles.length; j++) {
        let dist = 0;
        for (let k = 0; k < this._featureDimensions; k++) {
          dist += (styles[i].features[k] - styles[j].features[k]) ** 2;
        }
        totalDist += Math.sqrt(dist / this._featureDimensions);
        pairCount++;
      }
    }
    return pairCount > 0 ? totalDist / pairCount : 0;
  }

  public evolve(generations: number): StyleEvolutionState[] {
    const history: StyleEvolutionState[] = [];
    for (let i = 0; i < generations; i++) {
      history.push(this.evolveStep());
    }
    return history;
  }

  public findStyleClusters(threshold: number = 0.3): string[][] {
    const styles = Array.from(this._styles.keys());
    const visited = new Set<string>();
    const clusters: string[][] = [];

    for (const styleId of styles) {
      if (visited.has(styleId)) continue;

      const cluster: string[] = [];
      const queue = [styleId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        cluster.push(current);

        for (const other of styles) {
          if (!visited.has(other) && this.styleDistance(current, other) < threshold) {
            queue.push(other);
          }
        }
      }

      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  public styleTree(): Map<string, string[]> {
    const tree = new Map<string, string[]>();
    const stylesArray = Array.from(this._styles.values());
    for (const style of stylesArray) {
      tree.set(style.id, []);
    }
    for (const style of stylesArray) {
      for (const parent of style.parentage) {
        if (tree.has(parent)) {
          tree.get(parent)!.push(style.id);
        }
      }
    }
    return tree;
  }

  public knowledgeUnitToStyle(knowledge: KnowledgeUnit, id: string, name: string): Style {
    const features: number[] = [];
    for (let i = 0; i < this._featureDimensions; i++) {
      features.push(i < knowledge.vector.length ? knowledge.vector[i] : Math.random());
    }
    const style: Style = {
      id,
      name,
      features,
      weight: 1,
      parentage: knowledge.lineage.slice(0, 2),
      birthGeneration: this._generation,
      dominance: 0.5
    };
    this._styles.set(id, style);
    return style;
  }

  public styleToPacket(styleId: string): DataPacket<Signal> {
    const style = this._styles.get(styleId);
    return {
      id: `style-${styleId}-${Date.now()}`,
      payload: {
        source: style?.name || 'unknown',
        magnitude: style?.dominance || 0,
        entropy: 1 - (style ? this._calculateCoherence(style.features) : 0),
        timestamp: Date.now()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['aesthetics', 'style', styleId],
        priority: 0.6,
        phase: 'evolution'
      }
    };
  }

  public reset(): void {
    this._styles.clear();
    this._history = [];
    this._generation = 0;
    this._niches = [];
  }

  public getHistory(): StyleEvolutionState[] {
    return this._history.map(h => ({
      ...h,
      population: h.population.map(s => ({ ...s, features: [...s.features], parentage: [...s.parentage] }))
    }));
  }

  public getAllStyles(): Style[] {
    return Array.from(this._styles.values()).map(s => ({
      ...s,
      features: [...s.features],
      parentage: [...s.parentage]
    }));
  }
}
