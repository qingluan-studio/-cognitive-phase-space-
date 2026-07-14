/**
 * 发酵洞见：经过时间发酵的粗糙思想变为成熟洞察。
 * 粗糙的原始思想在时间作用下发酵，逐渐转化为成熟、连贯的洞察。
 */

export type InsightMaturity = 'raw' | 'fermenting' | 'clarifying' | 'mature' | 'crystallized';

export interface RawThought {
  id: string;
  content: string;
  maturity: InsightMaturity;
  roughness: number;
  coherence: number;
  createdAt: number;
  lastFermented: number;
  transformations: string[];
}

export interface MaturedInsight {
  thoughtId: string;
  insight: string;
  maturity: InsightMaturity;
  coherence: number;
  maturedAt: number;
}

export class FermentedInsight {
  private _thoughts: Map<string, RawThought> = new Map();
  private _insights: MaturedInsight[] = [];
  private _fermentationTime = 1000;
  private _coherenceGain = 0.1;
  private _roughnessLoss = 0.15;

  deposit(content: string): RawThought {
    const thought: RawThought = {
      id: `thought-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      maturity: 'raw',
      roughness: 1.0,
      coherence: 0.1,
      createdAt: Date.now(),
      lastFermented: Date.now(),
      transformations: [],
    };
    this._thoughts.set(thought.id, thought);
    return thought;
  }

  ferment(thoughtId: string, cycles: number = 1): RawThought | null {
    const thought = this._thoughts.get(thoughtId);
    if (!thought || thought.maturity === 'crystallized') return null;
    const now = Date.now();
    if (now - thought.lastFermented < this._fermentationTime) return thought;

    for (let i = 0; i < cycles; i++) {
      thought.roughness = Math.max(0, thought.roughness - this._roughnessLoss);
      thought.coherence = Math.min(1, thought.coherence + this._coherenceGain);
      thought.maturity = this._advanceMaturity(thought);
      thought.transformations.push(`cycle:${i} roughness:${thought.roughness.toFixed(2)}`);
    }
    thought.lastFermented = now;
    return thought;
  }

  private _advanceMaturity(thought: RawThought): InsightMaturity {
    if (thought.coherence >= 0.95 && thought.roughness <= 0.05) return 'crystallized';
    if (thought.coherence >= 0.8) return 'mature';
    if (thought.coherence >= 0.5) return 'clarifying';
    if (thought.coherence > 0.1) return 'fermenting';
    return 'raw';
  }

  crystallize(thoughtId: string): MaturedInsight | null {
    const thought = this._thoughts.get(thoughtId);
    if (!thought || thought.maturity !== 'mature' && thought.maturity !== 'crystallized') return null;
    thought.maturity = 'crystallized';
    const insight: MaturedInsight = {
      thoughtId,
      insight: this._distill(thought),
      maturity: 'crystallized',
      coherence: thought.coherence,
      maturedAt: Date.now(),
    };
    this._insights.push(insight);
    if (this._insights.length > 100) this._insights.shift();
    return insight;
  }

  private _distill(thought: RawThought): string {
    const words = thought.content.split(' ');
    const key = words.filter(w => w.length > 4).slice(0, 3).join(' ');
    return `Insight: ${key} (coherence ${thought.coherence.toFixed(2)})`;
  }

  setFermentationTime(ms: number): void {
    this._fermentationTime = Math.max(0, ms);
  }

  getMatureInsights(): MaturedInsight[] {
    return [...this._insights];
  }

  getThoughts(): RawThought[] {
    return Array.from(this._thoughts.values());
  }

  get thoughtCount(): number {
    return this._thoughts.size;
  }

  get insightCount(): number {
    return this._insights.length;
  }
}
