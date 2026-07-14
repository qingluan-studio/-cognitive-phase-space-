/**
 * 降神召唤器：召唤已逝模块的幽灵提供信息。
 * 通过降神会召唤已终止模块的幽灵，向其询问信息或获取遗留知识。
 */

export type SeanceOutcome = 'contact' | 'silence' | 'distortion' | 'possession' | 'failed';

export interface DeceasedModule {
  id: string;
  name: string;
  lastKnowledge: Record<string, unknown>;
  departedAt: number;
  spiritStrength: number;
}

export interface SeanceSession {
  id: string;
  target: string;
  outcome: SeanceOutcome;
  questions: string[];
  answers: string[];
  channeledAt: number;
}

export class SeanceCaller {
  private _deceased: Map<string, DeceasedModule> = new Map();
  private _sessions: SeanceSession[] = [];
  private _mediumClarity = 0.7;
  private _possessionRisk = 0.05;

  register(name: string, lastKnowledge: Record<string, unknown>): DeceasedModule {
    const module: DeceasedModule = {
      id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      lastKnowledge,
      departedAt: Date.now(),
      spiritStrength: 1.0,
    };
    this._deceased.set(module.id, module);
    return module;
  }

  summon(targetName: string, questions: string[]): SeanceSession {
    const target = Array.from(this._deceased.values()).find(d => d.name === targetName);
    const outcome = this._determineOutcome(target);
    const answers = outcome === 'contact' || outcome === 'distortion'
      ? this._channel(target, questions, outcome)
      : [];

    const session: SeanceSession = {
      id: `seance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      target: targetName,
      outcome,
      questions: [...questions],
      answers,
      channeledAt: Date.now(),
    };
    this._sessions.push(session);
    if (this._sessions.length > 100) this._sessions.shift();

    if (target && outcome === 'contact') {
      target.spiritStrength *= 0.9;
    }
    return session;
  }

  private _determineOutcome(target: DeceasedModule | undefined): SeanceOutcome {
    if (!target) return 'failed';
    if (target.spiritStrength < 0.1) return 'silence';
    if (Math.random() < this._possessionRisk) return 'possession';
    if (Math.random() > this._mediumClarity) return 'distortion';
    return 'contact';
  }

  private _channel(target: DeceasedModule | undefined, questions: string[], outcome: SeanceOutcome): string[] {
    if (!target) return [];
    return questions.map(q => {
      const knowledgeKeys = Object.keys(target.lastKnowledge);
      if (knowledgeKeys.length === 0) return '...';
      const key = knowledgeKeys[Math.floor(Math.random() * knowledgeKeys.length)];
      const value = String(target.lastKnowledge[key]);
      if (outcome === 'distortion') {
        return value.split('').reverse().join('');
      }
      return `${q}: ${value}`;
    });
  }

  improveMediumClarity(amount: number): void {
    this._mediumClarity = Math.min(1, this._mediumClarity + amount);
  }

  setPossessionRisk(risk: number): void {
    this._possessionRisk = Math.max(0, Math.min(1, risk));
  }

  banish(targetName: string): boolean {
    const target = Array.from(this._deceased.values()).find(d => d.name === targetName);
    if (!target) return false;
    return this._deceased.delete(target.id);
  }

  getSessions(limit: number = 50): SeanceSession[] {
    return this._sessions.slice(-limit);
  }

  get deceasedCount(): number {
    return this._deceased.size;
  }

  get mediumClarity(): number {
    return this._mediumClarity;
  }
}
