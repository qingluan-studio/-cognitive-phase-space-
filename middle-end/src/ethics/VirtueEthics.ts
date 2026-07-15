export interface Virtue {
  name: string;
  mean: number;
  deficiency: string;
  excess: string;
  currentState: number;
}

export interface CharacterProfile {
  agentId: string;
  virtues: Map<string, number>;
  eudaimonia: number;
}

export class VirtueEthics {
  private _virtues: Map<string, Virtue>;
  private _profiles: Map<string, CharacterProfile>;
  private _history: { agentId: string; action: string; virtueShift: Map<string, number> }[];

  constructor() {
    this._virtues = new Map();
    this._profiles = new Map();
    this._history = [];
  }

  get virtueCount(): number { return this._virtues.size; }
  get agentCount(): number { return this._profiles.size; }

  public defineVirtue(name: string, mean: number, deficiency: string, excess: string): void {
    this._virtues.set(name, { name, mean, deficiency, excess, currentState: mean });
  }

  public createAgent(agentId: string): void {
    const virtues = new Map<string, number>();
    for (const [name, v] of this._virtues) {
      virtues.set(name, v.mean);
    }
    this._profiles.set(agentId, { agentId, virtues, eudaimonia: 0 });
  }

  public evaluateAction(agentId: string, actionVirtues: Map<string, number>): number {
    const profile = this._profiles.get(agentId);
    if (!profile) return 0;
    let totalDistance = 0;
    let count = 0;
    for (const [virtueName, actionLevel] of actionVirtues) {
      const virtue = this._virtues.get(virtueName);
      if (virtue) {
        const distance = Math.abs(actionLevel - virtue.mean);
        totalDistance += distance;
        count++;
      }
    }
    return count > 0 ? 1 - totalDistance / count : 0;
  }

  public updateCharacter(agentId: string, actionVirtues: Map<string, number>, action: string): void {
    const profile = this._profiles.get(agentId);
    if (!profile) return;
    const shift = new Map<string, number>();
    for (const [virtueName, actionLevel] of actionVirtues) {
      const current = profile.virtues.get(virtueName) || 0;
      const newValue = current + (actionLevel - current) * 0.1;
      profile.virtues.set(virtueName, newValue);
      shift.set(virtueName, newValue - current);
    }
    this._updateEudaimonia(agentId);
    this._history.push({ agentId, action, virtueShift: shift });
  }

  private _updateEudaimonia(agentId: string): void {
    const profile = this._profiles.get(agentId);
    if (!profile) return;
    let sum = 0;
    for (const [name, value] of profile.virtues) {
      const virtue = this._virtues.get(name);
      if (virtue) {
        sum += 1 - Math.abs(value - virtue.mean);
      }
    }
    profile.eudaimonia = sum / profile.virtues.size;
  }

  public getEudaimonia(agentId: string): number {
    const profile = this._profiles.get(agentId);
    return profile ? profile.eudaimonia : 0;
  }

  public findVice(agentId: string, virtueName: string): 'deficiency' | 'excess' | 'balanced' {
    const profile = this._profiles.get(agentId);
    const virtue = this._virtues.get(virtueName);
    if (!profile || !virtue) return 'balanced';
    const value = profile.virtues.get(virtueName) || 0;
    if (value < virtue.mean - 0.3) return 'deficiency';
    if (value > virtue.mean + 0.3) return 'excess';
    return 'balanced';
  }

  public computeFlourishing(agentId: string): number {
    return this.getEudaimonia(agentId);
  }

  public compareCharacters(agentA: string, agentB: string): number {
    return this.getEudaimonia(agentA) - this.getEudaimonia(agentB);
  }

  public simulateHabituation(agentId: string, virtueName: string, repetitions: number = 10): void {
    const virtue = this._virtues.get(virtueName);
    if (!virtue) return;
    for (let i = 0; i < repetitions; i++) {
      const action = new Map<string, number>();
      action.set(virtueName, virtue.mean + (Math.random() - 0.5) * 0.2);
      this.updateCharacter(agentId, action, `habituation_${i}`);
    }
  }

  public getVirtueBalance(agentId: string): Map<string, number> {
    const profile = this._profiles.get(agentId);
    const balance = new Map<string, number>();
    if (!profile) return balance;
    for (const [name, value] of profile.virtues) {
      const virtue = this._virtues.get(name);
      if (virtue) {
        balance.set(name, value - virtue.mean);
      }
    }
    return balance;
  }

  public resetAgent(agentId: string): void {
    this.createAgent(agentId);
  }

  public reset(): void {
    this._virtues.clear();
    this._profiles.clear();
    this._history = [];
  }

  public exportProfiles(): CharacterProfile[] {
    return Array.from(this._profiles.values()).map(p => ({
      agentId: p.agentId,
      virtues: new Map(p.virtues),
      eudaimonia: p.eudaimonia
    }));
  }
}
