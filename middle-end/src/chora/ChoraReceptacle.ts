/**
 * 混沌容器：温养尚未成型的原型思想，直到自发结晶。
 * 仿照柏拉图的 Chora（容器/接收体），温养尚未成形的
 * 原型思想，等待其在合适条件下自发结晶为成型产物。
 */

export interface PrototypeThought {
  id: string;
  rawIdea: Record<string, unknown>;
  warmth: number;
  crystallized: boolean;
  nurturedAt: number;
}

export interface CrystallizedForm {
  id: string;
  from: string;
  form: Record<string, unknown>;
  crystallizedAt: number;
}

export class ChoraReceptacle {
  private _prototypes: PrototypeThought[] = [];
  private _crystallized: CrystallizedForm[] = [];
  private _ambientWarmth: number = 0.3;
  private _crystallizationThreshold: number = 0.8;

  /** 把一个未成型的原型思想放入容器温养。 */
  nurture(idea: Record<string, unknown>): PrototypeThought {
    const p: PrototypeThought = {
      id: `proto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rawIdea: idea,
      warmth: this._ambientWarmth,
      crystallized: false,
      nurturedAt: Date.now(),
    };
    this._prototypes.push(p);
    return p;
  }

  /** 孵化：给容器加温，加速原型成熟。 */
  incubate(heat: number): number {
    this._ambientWarmth = Math.min(1, this._ambientWarmth + heat * 0.1);
    for (const p of this._prototypes) {
      if (!p.crystallized) {
        p.warmth = Math.min(1, p.warmth + heat * 0.05);
      }
    }
    return this._ambientWarmth;
  }

  /** 尝试结晶：达到临界温度的原型自发结晶。 */
  crystallize(): CrystallizedForm[] {
    const newly: CrystallizedForm[] = [];
    for (const p of this._prototypes) {
      if (!p.crystallized && p.warmth >= this._crystallizationThreshold) {
        p.crystallized = true;
        const form: CrystallizedForm = {
          id: `form-${p.id}`,
          from: p.id,
          form: { ...p.rawIdea, _crystallized: true },
          crystallizedAt: Date.now(),
        };
        this._crystallized.push(form);
        newly.push(form);
      }
    }
    return newly;
  }

  /** 收割已结晶的成型产物。 */
  harvest(): CrystallizedForm[] {
    const out = [...this._crystallized];
    this._crystallized = [];
    return out;
  }

  /** 评估容器内原型成熟度。 */
  evaluate(): { total: number; mature: number; averageWarmth: number } {
    const total = this._prototypes.length;
    const mature = this._prototypes.filter(p => p.warmth >= this._crystallizationThreshold).length;
    const avg = total === 0 ? 0 : this._prototypes.reduce((s, p) => s + p.warmth, 0) / total;
    return { total, mature, averageWarmth: avg };
  }

  getPrototypes(): PrototypeThought[] {
    return [...this._prototypes];
  }

  get ambientWarmth(): number {
    return this._ambientWarmth;
  }

  get crystallizedCount(): number {
    return this._crystallized.length;
  }
}
