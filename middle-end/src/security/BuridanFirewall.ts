export type DecoyKind = 'honey-pot' | 'mirror-endpoint' | 'phantom-record' | 'twin-service';

export interface Decoy {
  id: string;
  kind: DecoyKind;
  lureValue: number;
  equivalentTo: string | null;
  active: boolean;
  entropy: number;
  responseDelay: number;
  cost: number;
}

export interface AttackerState {
  id: string;
  positionedBetween: [string, string];
  hesitationCycles: number;
  resources: number;
  paralyzed: boolean;
  confusion: number;
  choiceHistory: string[];
  lastChoiceAt: number;
}

export interface StarvationEvent {
  attackerId: string;
  decoyPair: string;
  cyclesToParalysis: number;
  resourcesDepleted: number;
  timestamp: number;
}

export class BuridanFirewall {
  private _decoys: Map<string, Decoy> = new Map();
  private _attackers: Map<string, AttackerState> = new Map();
  private _pairs: Map<string, [string, string]> = new Map();
  private _starvationThreshold = 8;
  private _totalParalyzed = 0;
  private _starvationEvents: StarvationEvent[] = [];
  private _equivalenceTolerance = 0.001;
  private _resourceDrainRate = 8;

  deployDecoyPair(decoyA: Decoy, decoyB: Decoy): void {
    const avgLure = (decoyA.lureValue + decoyB.lureValue) / 2;
    const targetLure = Math.round(avgLure * 1000) / 1000;

    const finalA: Decoy = {
      ...decoyA,
      lureValue: targetLure,
      equivalentTo: decoyB.id,
      entropy: 0.1 + Math.random() * 0.1,
      responseDelay: 100 + Math.random() * 200,
      cost: this._calculateDecoyCost(decoyA),
    };

    const finalB: Decoy = {
      ...decoyB,
      lureValue: targetLure,
      equivalentTo: decoyA.id,
      entropy: 0.1 + Math.random() * 0.1,
      responseDelay: 100 + Math.random() * 200,
      cost: this._calculateDecoyCost(decoyB),
    };

    this._decoys.set(finalA.id, finalA);
    this._decoys.set(finalB.id, finalB);
    this._pairs.set(`pair-${finalA.id}-${finalB.id}`, [finalA.id, finalB.id]);
  }

  private _calculateDecoyCost(decoy: Decoy): number {
    const kindCosts: Record<DecoyKind, number> = {
      'honey-pot': 10,
      'mirror-endpoint': 25,
      'phantom-record': 5,
      'twin-service': 50,
    };
    return kindCosts[decoy.kind] * (1 + decoy.entropy);
  }

  trapAttacker(attackerId: string, pairKey: string): AttackerState {
    const pair = this._pairs.get(pairKey);
    if (!pair) throw new Error(`Unknown decoy pair: ${pairKey}`);

    const state: AttackerState = {
      id: attackerId,
      positionedBetween: pair,
      hesitationCycles: 0,
      resources: 100 + Math.random() * 50,
      paralyzed: false,
      confusion: 0,
      choiceHistory: [],
      lastChoiceAt: Date.now(),
    };

    this._attackers.set(attackerId, state);
    return state;
  }

  attemptChoice(attackerId: string, decoyId: string): { mirrored: boolean; remaining: number; confusionDelta: number } {
    const attacker = this._attackers.get(attackerId);
    if (!attacker || attacker.paralyzed) return { mirrored: false, remaining: 0, confusionDelta: 0 };

    const chosen = this._decoys.get(decoyId);
    if (!chosen || !chosen.equivalentTo) return { mirrored: false, remaining: attacker.resources, confusionDelta: 0 };

    const other = this._decoys.get(chosen.equivalentTo);
    if (!other) return { mirrored: false, remaining: attacker.resources, confusionDelta: 0 };

    attacker.hesitationCycles++;
    attacker.resources -= this._resourceDrainRate * (1 + chosen.cost / 100);
    attacker.choiceHistory.push(decoyId);
    attacker.lastChoiceAt = Date.now();

    const lureDiff = Math.abs(chosen.lureValue - other.lureValue);
    let confusionDelta = 0;

    if (lureDiff < this._equivalenceTolerance) {
      confusionDelta = 0.15 + attacker.hesitationCycles * 0.02;
    } else {
      confusionDelta = -0.05;
    }

    attacker.confusion = Math.max(0, Math.min(1, attacker.confusion + confusionDelta));

    const shouldParalyze = attacker.hesitationCycles >= this._starvationThreshold ||
      attacker.resources <= 0 ||
      attacker.confusion > 0.8;

    if (shouldParalyze) {
      attacker.paralyzed = true;
      this._totalParalyzed++;
      this._recordStarvation(attackerId, pairKey, attacker);
    }

    return {
      mirrored: true,
      remaining: attacker.resources,
      confusionDelta,
    };
  }

  private _recordStarvation(attackerId: string, pairKey: string, attacker: AttackerState): void {
    const event: StarvationEvent = {
      attackerId,
      decoyPair: pairKey,
      cyclesToParalysis: attacker.hesitationCycles,
      resourcesDepleted: 100 - attacker.resources,
      timestamp: Date.now(),
    };
    this._starvationEvents.push(event);
  }

  rebalancePairs(): void {
    for (const [pairKey, [idA, idB]] of this._pairs) {
      const a = this._decoys.get(idA);
      const b = this._decoys.get(idB);
      if (!a || !b) continue;

      const avgLure = (a.lureValue + b.lureValue) / 2;
      const jitter = (Math.random() - 0.5) * 0.0002;
      const targetLure = Math.max(0, Math.min(1, avgLure + jitter));

      a.lureValue = targetLure;
      b.lureValue = targetLure;

      a.entropy = Math.min(0.3, a.entropy + 0.01);
      b.entropy = Math.min(0.3, b.entropy + 0.01);

      a.responseDelay = 100 + Math.random() * 200;
      b.responseDelay = 100 + Math.random() * 200;
    }
  }

  releaseAttacker(attackerId: string): boolean {
    return this._attackers.delete(attackerId);
  }

  getAttacker(attackerId: string): AttackerState | undefined {
    const a = this._attackers.get(attackerId);
    return a ? { ...a, choiceHistory: [...a.choiceHistory] } : undefined;
  }

  calculatePairEquivalence(pairKey: string): number {
    const pair = this._pairs.get(pairKey);
    if (!pair) return 0;
    const [idA, idB] = pair;
    const a = this._decoys.get(idA);
    const b = this._decoys.get(idB);
    if (!a || !b) return 0;

    const lureDiff = Math.abs(a.lureValue - b.lureValue);
    const entropyDiff = Math.abs(a.entropy - b.entropy);
    const delayDiff = Math.abs(a.responseDelay - b.responseDelay) / 300;

    return 1 - (lureDiff * 0.5 + entropyDiff * 0.3 + delayDiff * 0.2);
  }

  getParalyzedCount(): number {
    return this._totalParalyzed;
  }

  listDecoys(): string[] {
    return Array.from(this._decoys.keys());
  }

  get decoyCount(): number {
    return this._decoys.size;
  }

  get pairCount(): number {
    return this._pairs.size;
  }

  get attackerCount(): number {
    return this._attackers.size;
  }

  get starvationEvents(): StarvationEvent[] {
    return [...this._starvationEvents];
  }
}