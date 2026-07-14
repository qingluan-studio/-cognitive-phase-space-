/**
 * 思想酵母：微小想法发酵膨胀，产生巨大效果。
 * 微小的种子想法在酵母作用下发酵膨胀，逐步成长为具有巨大影响力的思想。
 */

export type FermentationStage = 'seed' | 'bubbling' | 'rising' | 'mature' | 'overflow';

export interface YeastIdea {
  id: string;
  seed: string;
  stage: FermentationStage;
  volume: number;
  yeastConcentration: number;
  startedAt: number;
  expansions: string[];
}

export class IdeaYeast {
  private _ideas: Map<string, YeastIdea> = new Map();
  private _fermentationRate = 1.5;
  private _overflowThreshold = 1000;
  private _expansionTemplates: string[] = [
    'What if we extend {seed} to all domains?',
    '{seed} suggests a deeper principle.',
    'Apply {seed} recursively for compounding effect.',
    'Invert {seed} to find its complement.',
  ];

  plant(seed: string): YeastIdea {
    const idea: YeastIdea = {
      id: `yeast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      seed,
      stage: 'seed',
      volume: 1,
      yeastConcentration: 0.1,
      startedAt: Date.now(),
      expansions: [],
    };
    this._ideas.set(idea.id, idea);
    return idea;
  }

  ferment(ideaId: string, cycles: number = 1): YeastIdea | null {
    const idea = this._ideas.get(ideaId);
    if (!idea || idea.stage === 'overflow') return null;
    for (let i = 0; i < cycles; i++) {
      idea.volume *= this._fermentationRate;
      idea.yeastConcentration = Math.min(1, idea.yeastConcentration * 1.1);
      idea.stage = this._determineStage(idea.volume);
      idea.expansions.push(this._expand(idea.seed));
    }
    return idea;
  }

  private _determineStage(volume: number): FermentationStage {
    if (volume >= this._overflowThreshold) return 'overflow';
    if (volume >= 100) return 'mature';
    if (volume >= 10) return 'rising';
    if (volume > 1) return 'bubbling';
    return 'seed';
  }

  private _expand(seed: string): string {
    const template = this._expansionTemplates[Math.floor(Math.random() * this._expansionTemplates.length)];
    return template.replace('{seed}', seed);
  }

  addYeast(ideaId: string, amount: number): YeastIdea | null {
    const idea = this._ideas.get(ideaId);
    if (!idea) return null;
    idea.yeastConcentration = Math.min(1, idea.yeastConcentration + amount);
    return idea;
  }

  harvest(ideaId: string): YeastIdea | null {
    const idea = this._ideas.get(ideaId);
    if (!idea) return null;
    idea.stage = 'mature';
    return idea;
  }

  setFermentationRate(rate: number): void {
    this._fermentationRate = Math.max(1, rate);
  }

  getMatureIdeas(): YeastIdea[] {
    return Array.from(this._ideas.values()).filter(i => i.stage === 'mature' || i.stage === 'overflow');
  }

  getIdeas(): YeastIdea[] {
    return Array.from(this._ideas.values());
  }

  get ideaCount(): number {
    return this._ideas.size;
  }
}
