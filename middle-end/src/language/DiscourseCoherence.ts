export interface DiscourseSegment {
  id: number;
  entities: string[];
  predicates: string[];
  tense: string;
  sentiment: number;
}

export interface CoherenceChain {
  entity: string;
  segments: number[];
  continuity: number;
}

export class DiscourseCoherence {
  private _segments: DiscourseSegment[];
  private _chains: CoherenceChain[];
  private _history: { segmentId: number; coherenceScore: number }[];
  private _entityTransitions: Map<string, number>;

  constructor() {
    this._segments = [];
    this._chains = [];
    this._history = [];
    this._entityTransitions = new Map();
  }

  get segmentCount(): number { return this._segments.length; }
  get chainCount(): number { return this._chains.length; }

  public addSegment(entities: string[], predicates: string[], tense: string = 'present', sentiment: number = 0): DiscourseSegment {
    const segment: DiscourseSegment = {
      id: this._segments.length,
      entities: [...entities],
      predicates: [...predicates],
      tense,
      sentiment
    };
    this._segments.push(segment);
    this._updateChains(segment);
    return segment;
  }

  private _updateChains(segment: DiscourseSegment): void {
    for (const entity of segment.entities) {
      const chain = this._chains.find(c => c.entity === entity);
      if (chain) {
        chain.segments.push(segment.id);
        chain.continuity = chain.segments.length / this._segments.length;
      } else {
        this._chains.push({ entity, segments: [segment.id], continuity: 1 / this._segments.length });
      }
    }
  }

  public computeEntityCoherence(): number {
    if (this._segments.length < 2) return 0;
    let overlaps = 0;
    for (let i = 1; i < this._segments.length; i++) {
      const prev = new Set(this._segments[i - 1].entities);
      const curr = new Set(this._segments[i].entities);
      const intersection = new Set([...prev].filter(x => curr.has(x)));
      overlaps += intersection.size / Math.max(prev.size, curr.size);
    }
    return overlaps / (this._segments.length - 1);
  }

  public computeTenseConsistency(): number {
    if (this._segments.length < 2) return 1;
    let consistent = 0;
    for (let i = 1; i < this._segments.length; i++) {
      if (this._segments[i].tense === this._segments[i - 1].tense) consistent++;
    }
    return consistent / (this._segments.length - 1);
  }

  public computeSentimentFlow(): number {
    if (this._segments.length < 2) return 0;
    let flow = 0;
    for (let i = 1; i < this._segments.length; i++) {
      flow += Math.abs(this._segments[i].sentiment - this._segments[i - 1].sentiment);
    }
    return flow / (this._segments.length - 1);
  }

  public computeOverallCoherence(): number {
    const entity = this.computeEntityCoherence();
    const tense = this.computeTenseConsistency();
    const sentiment = 1 - Math.min(1, this.computeSentimentFlow());
    return (entity + tense + sentiment) / 3;
  }

  public findTopicShifts(): number[] {
    const shifts: number[] = [];
    for (let i = 1; i < this._segments.length; i++) {
      const prev = new Set(this._segments[i - 1].entities);
      const curr = new Set(this._segments[i].entities);
      const intersection = new Set([...prev].filter(x => curr.has(x)));
      if (intersection.size === 0) shifts.push(i);
    }
    return shifts;
  }

  public getCenteringTransitions(): { transition: string; count: number }[] {
    const transitions: Map<string, number> = new Map();
    for (let i = 1; i < this._segments.length; i++) {
      const prevEntities = this._segments[i - 1].entities;
      const currEntities = this._segments[i].entities;
      let transition: string;
      if (currEntities.length > 0 && prevEntities.length > 0 && currEntities[0] === prevEntities[0]) {
        transition = 'continue';
      } else if (currEntities.length > 0 && prevEntities.includes(currEntities[0])) {
        transition = 'retain';
      } else if (prevEntities.length > 0 && currEntities.includes(prevEntities[0])) {
        transition = 'smooth-shift';
      } else {
        transition = 'rough-shift';
      }
      transitions.set(transition, (transitions.get(transition) || 0) + 1);
    }
    return Array.from(transitions.entries()).map(([t, c]) => ({ transition: t, count: c }));
  }

  public computeChainStrength(entity: string): number {
    const chain = this._chains.find(c => c.entity === entity);
    return chain ? chain.continuity : 0;
  }

  public predictNextEntity(): string | null {
    if (this._chains.length === 0) return null;
    this._chains.sort((a, b) => b.continuity - a.continuity);
    return this._chains[0].entity;
  }

  public generateSummary(maxSegments: number = 3): DiscourseSegment[] {
    const scores = this._segments.map((s, idx) => ({
      segment: s,
      score: this._computeSegmentImportance(idx)
    }));
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, maxSegments).map(s => ({ ...s.segment, entities: [...s.segment.entities], predicates: [...s.segment.predicates] }));
  }

  private _computeSegmentImportance(index: number): number {
    const segment = this._segments[index];
    let importance = segment.entities.length;
    const chainBonus = segment.entities.reduce((sum, e) => sum + this.computeChainStrength(e), 0);
    importance += chainBonus;
    if (index === 0 || index === this._segments.length - 1) importance *= 1.2;
    return importance;
  }

  public reset(): void {
    this._segments = [];
    this._chains = [];
    this._history = [];
    this._entityTransitions.clear();
  }

  public exportSegments(): DiscourseSegment[] {
    return this._segments.map(s => ({
      id: s.id,
      entities: [...s.entities],
      predicates: [...s.predicates],
      tense: s.tense,
      sentiment: s.sentiment
    }));
  }
}
