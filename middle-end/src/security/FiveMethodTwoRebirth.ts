export type Element = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

export interface DefenseLayer {
  element: Element;
  strength: number;
  regenerates: boolean;
  active: boolean;
  efficiency: number;
  entropy: number;
}

export interface AttackVector {
  id: string;
  element: Element;
  power: number;
  timestamp: number;
  duration: number;
  frequency: number;
}

export interface RebirthCycle {
  cycle: number;
  redTeamScore: number;
  blueTeamScore: number;
  rebornAt: number;
  energyTransferred: number;
  layerEvolution: Record<Element, number>;
}

const _GENERATING: Record<Element, Element> = {
  metal: 'water',
  wood: 'fire',
  water: 'wood',
  fire: 'earth',
  earth: 'metal',
};

const _OVERCOMING: Record<Element, Element> = {
  metal: 'wood',
  wood: 'earth',
  water: 'fire',
  fire: 'metal',
  earth: 'water',
};

const _ELEMENT_VALUES: Record<Element, number> = {
  metal: 0.2,
  wood: 0.4,
  water: 0.6,
  fire: 0.8,
  earth: 1.0,
};

export class FiveMethodTwoRebirth {
  private _layers: Map<Element, DefenseLayer> = new Map();
  private _attacks: AttackVector[] = [];
  private _rebirths: RebirthCycle[] = [];
  private _cycle = 0;
  private _redScore = 0;
  private _blueScore = 0;
  private _totalEnergy = 0;
  private _efficiencyDecay = 0.98;
  private _regenerationBase = 0.05;

  constructor() {
    this._initializeLayers();
  }

  private _initializeLayers(): void {
    const elements: Element[] = ['metal', 'wood', 'water', 'fire', 'earth'];
    for (const element of elements) {
      this._layers.set(element, {
        element,
        strength: 0.7 + Math.random() * 0.3,
        regenerates: true,
        active: true,
        efficiency: 1,
        entropy: Math.random() * 0.2,
      });
    }
  }

  deployLayer(layer: DefenseLayer): void {
    this._layers.set(layer.element, { ...layer });
  }

  defendAgainst(attack: AttackVector): { repelled: boolean; weakened: Element | null; absorbed: number } {
    this._attacks.push(attack);
    const defender = this._layers.get(attack.element);
    if (!defender || !defender.active) {
      this._redScore += attack.power * (1 + attack.frequency * 0.1);
      return { repelled: false, weakened: null, absorbed: 0 };
    }

    const overcomes = _OVERCOMING[attack.element];
    const ally = this._layers.get(overcomes);
    const generator = _GENERATING[attack.element];
    const generatorLayer = this._layers.get(generator);

    let totalStrength = defender.strength * defender.efficiency;
    if (ally?.active) {
      totalStrength += ally.strength * ally.efficiency * 0.3 * (1 + _ELEMENT_VALUES[ally.element]);
    }
    if (generatorLayer?.active) {
      totalStrength += generatorLayer.strength * 0.15 * defender.efficiency;
    }

    const attackEffective = attack.power * (1 + attack.duration * 0.02) * (1 - defender.entropy);
    const repelled = totalStrength >= attackEffective;
    const absorbed = repelled ? attackEffective * 0.4 : 0;

    if (repelled) {
      this._blueScore += attackEffective;
      this._totalEnergy += absorbed;
      defender.efficiency = Math.min(1, defender.efficiency + 0.02);
    } else {
      const damage = attackEffective - totalStrength;
      defender.strength = Math.max(0, defender.strength - damage * 0.5);
      defender.efficiency *= this._efficiencyDecay;
      defender.entropy = Math.min(1, defender.entropy + 0.03);
      this._redScore += damage;
    }

    return { repelled, weakened: repelled ? null : attack.element, absorbed };
  }

  regenerate(): Element[] {
    const reborn: Element[] = [];
    for (const [element, layer] of this._layers) {
      if (!layer.regenerates || !layer.active) continue;
      const generator = this._layers.get(_GENERATING[element]);
      const regenRate = this._regenerationBase * (1 + (generator?.active ? 0.5 : 0)) * layer.efficiency;
      const newStrength = Math.min(1, layer.strength + regenRate);
      if (newStrength > layer.strength) {
        layer.strength = newStrength;
        layer.entropy = Math.max(0, layer.entropy - 0.01);
        reborn.push(element);
      }
    }
    return reborn;
  }

  rebirth(): RebirthCycle {
    this._cycle++;
    const energyTransferred = this._totalEnergy * 0.3;
    const layerEvolution: Record<Element, number> = {} as Record<Element, number>;

    for (const [element, layer] of this._layers) {
      const baseRecovery = 0.3 + Math.random() * 0.2;
      const evolution = baseRecovery * (1 + (this._blueScore > this._redScore ? 0.2 : -0.1));
      layer.strength = Math.min(1, layer.strength + evolution);
      layer.efficiency = Math.min(1, layer.efficiency + 0.1);
      layer.entropy = Math.max(0, layer.entropy - 0.1);
      layer.active = true;
      layerEvolution[element] = evolution;
    }

    const cycle: RebirthCycle = {
      cycle: this._cycle,
      redTeamScore: this._redScore,
      blueTeamScore: this._blueScore,
      rebornAt: Date.now(),
      energyTransferred,
      layerEvolution,
    };

    this._rebirths.push(cycle);
    this._totalEnergy = this._totalEnergy * 0.7;
    return cycle;
  }

  rebalanceCycle(): void {
    const avgStrength = Array.from(this._layers.values())
      .filter(l => l.active)
      .reduce((sum, l) => sum + l.strength, 0) / this._layers.size;

    for (const [element, layer] of this._layers) {
      const generator = _GENERATING[element];
      const genLayer = this._layers.get(generator);

      if (genLayer?.active) {
        const boost = (genLayer.strength - avgStrength) * 0.1;
        layer.strength = Math.min(1, Math.max(0, layer.strength + boost));
      }

      const imbalance = layer.strength - avgStrength;
      if (Math.abs(imbalance) > 0.2) {
        layer.strength = avgStrength + imbalance * 0.5;
      }
    }
  }

  calculateBalanceIndex(): number {
    let balance = 0;
    for (const element of ['metal', 'wood', 'water', 'fire', 'earth'] as Element[]) {
      const layer = this._layers.get(element);
      const genLayer = this._layers.get(_GENERATING[element]);
      const overcomeLayer = this._layers.get(_OVERCOMING[element]);
      if (layer && genLayer && overcomeLayer) {
        balance += Math.abs(layer.strength - genLayer.strength) * 0.3;
        balance += Math.abs(layer.strength - overcomeLayer.strength) * 0.2;
      }
    }
    return 1 - balance / 5;
  }

  getLayer(element: Element): DefenseLayer | undefined {
    const l = this._layers.get(element);
    return l ? { ...l } : undefined;
  }

  getAttackHistory(): AttackVector[] {
    return [...this._attacks];
  }

  getRebirthHistory(): RebirthCycle[] {
    return [...this._rebirths];
  }

  get currentCycle(): number {
    return this._cycle;
  }

  get redScore(): number {
    return this._redScore;
  }

  get blueScore(): number {
    return this._blueScore;
  }

  get totalEnergy(): number {
    return this._totalEnergy;
  }

  get balanceIndex(): number {
    return this.calculateBalanceIndex();
  }
}