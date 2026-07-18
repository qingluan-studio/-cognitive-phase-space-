import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface Mechanic {
  id: string;
  name: string;
  type: 'core' | 'secondary' | 'metagame';
  description: string;
  complexity: number;
  balance: number;
  interactions: string[];
}

export interface GameLoop {
  id: string;
  phases: string[];
  currentPhase: number;
  iterations: number;
  cycleTime: number;
  feedbackStrength: number;
}

export interface PlayerState {
  id: string;
  name: string;
  resources: Map<string, number>;
  skills: Map<string, number>;
  progression: number;
  actionsTaken: number;
  createdAt: number;
}

export class GameMechanics {
  private _mechanics: Map<string, Mechanic> = new Map();
  private _loops: Map<string, GameLoop> = new Map();
  private _players: Map<string, PlayerState> = new Map();
  private _history: string[] = [];
  private _balanceScore = 0.5;
  private _counter = 0;

  defineMechanic(name: string, type: Mechanic['type']): Mechanic {
    const id = `mech-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const mechanic: Mechanic = {
      id,
      name,
      type,
      description: `Game mechanic: ${name}`,
      complexity: 0.3 + Math.random() * 0.4,
      balance: 0.5,
      interactions: [],
    };
    this._mechanics.set(id, mechanic);
    this._updateBalanceScore();
    this._recordHistory(`defineMechanic:${name}:${type}`);
    return mechanic;
  }

  createGameLoop(phases: string[]): GameLoop {
    const id = `loop-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const loop: GameLoop = {
      id,
      phases,
      currentPhase: 0,
      iterations: 0,
      cycleTime: phases.length * 1000,
      feedbackStrength: 0.5,
    };
    this._loops.set(id, loop);
    this._recordHistory(`createGameLoop:${phases.length}phases`);
    return loop;
  }

  playerAction(playerId: string, action: string): PlayerState | null {
    const player = this._players.get(playerId);
    if (!player) return null;

    player.actionsTaken++;
    player.progression = Math.min(1, player.progression + 0.02);

    for (const loop of this._loops.values()) {
      loop.currentPhase = (loop.currentPhase + 1) % loop.phases.length;
      if (loop.currentPhase === 0) {
        loop.iterations++;
      }
    }

    this._recordHistory(`playerAction:${playerId}:${action}`);
    return player;
  }

  resourceFlow(playerId: string, resource: string, delta: number): PlayerState | null {
    const player = this._players.get(playerId);
    if (!player) return null;

    const current = player.resources.get(resource) ?? 0;
    player.resources.set(resource, Math.max(0, current + delta));

    this._recordHistory(`resourceFlow:${playerId}:${resource}:${delta > 0 ? '+' : ''}${delta}`);
    return player;
  }

  progressionCurve(playerId: string): { level: number; xp: number; nextLevelAt: number } | null {
    const player = this._players.get(playerId);
    if (!player) return null;

    const xp = player.progression * 1000;
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    const nextLevelAt = Math.pow(level, 2) * 100;

    return {
      level,
      xp,
      nextLevelAt,
    };
  }

  skillTree(playerId: string, skill: string): PlayerState | null {
    const player = this._players.get(playerId);
    if (!player) return null;

    const current = player.skills.get(skill) ?? 0;
    player.skills.set(skill, Math.min(1, current + 0.1));

    this._recordHistory(`skillTree:${playerId}:${skill}`);
    return player;
  }

  balanceScore(): number {
    this._updateBalanceScore();
    return this._balanceScore;
  }

  emergentGameplayDetect(): { detected: boolean; indicators: string[]; score: number } {
    const indicators: string[] = [];
    let score = 0;

    if (this._mechanics.size >= 5) {
      indicators.push('multiple mechanics');
      score += 0.2;
    }

    if (this._mechanics.size >= 3 && this._loops.size >= 2) {
      indicators.push('interlocking systems');
      score += 0.25;
    }

    const totalInteractions = Array.from(this._mechanics.values()).reduce(
      (s, m) => s + m.interactions.length, 0
    );
    if (totalInteractions >= 5) {
      indicators.push('mechanic interactions');
      score += 0.2;
    }

    if (this._players.size >= 2) {
      indicators.push('multiple players');
      score += 0.15;
    }

    const playerDiversity = Array.from(this._players.values()).filter(
      p => p.skills.size > 0 || p.resources.size > 2
    ).length;
    if (playerDiversity >= 2) {
      indicators.push('player divergence');
      score += 0.2;
    }

    this._recordHistory(`emergentGameplayDetect:${score.toFixed(2)}`);
    return {
      detected: score >= 0.5,
      indicators,
      score: Math.min(1, score),
    };
  }

  mechanicInteraction(mechanicA: string, mechanicB: string): {
    synergistic: boolean;
    strength: number;
    description: string;
  } {
    const mechA = this._mechanics.get(mechanicA);
    const mechB = this._mechanics.get(mechanicB);

    if (!mechA || !mechB) {
      return { synergistic: false, strength: 0, description: 'One or both mechanics not found' };
    }

    const typeMatch = mechA.type === mechB.type;
    const complexitySum = mechA.complexity + mechB.complexity;
    const strength = typeMatch ? 0.7 : 0.4 + complexitySum * 0.1;

    const synergistic = strength >= 0.6;
    const description = synergistic
      ? `${mechA.name} and ${mechB.name} create interesting gameplay combinations`
      : `${mechA.name} and ${mechB.name} have limited interaction`;

    return { synergistic, strength: Math.min(1, strength), description };
  }

  gameLoopIterations(): number {
    let total = 0;
    for (const loop of this._loops.values()) {
      total += loop.iterations;
    }
    return total;
  }

  playerRanking(): PlayerState[] {
    return Array.from(this._players.values())
      .sort((a, b) => b.progression - a.progression);
  }

  richestPlayer(resource: string): PlayerState | null {
    if (this._players.size === 0) return null;

    let richest: PlayerState | null = null;
    let maxResource = -Infinity;

    for (const player of this._players.values()) {
      const amount = player.resources.get(resource) ?? 0;
      if (amount > maxResource) {
        maxResource = amount;
        richest = player;
      }
    }

    return richest;
  }

  mostSkilledPlayer(): PlayerState | null {
    if (this._players.size === 0) return null;

    let mostSkilled: PlayerState | null = null;
    let maxSkills = -1;

    for (const player of this._players.values()) {
      const totalSkills = Array.from(player.skills.values()).reduce((s, v) => s + v, 0);
      if (totalSkills > maxSkills) {
        maxSkills = totalSkills;
        mostSkilled = player;
      }
    }

    return mostSkilled;
  }

  resourceEconomy(): Record<string, { total: number; avg: number; min: number; max: number }> {
    const allResources: Record<string, number[]> = {};

    for (const player of this._players.values()) {
      for (const [resource, amount] of player.resources) {
        if (!allResources[resource]) {
          allResources[resource] = [];
        }
        allResources[resource].push(amount);
      }
    }

    const result: Record<string, { total: number; avg: number; min: number; max: number }> = {};
    for (const [resource, values] of Object.entries(allResources)) {
      const total = values.reduce((a, b) => a + b, 0);
      result[resource] = {
        total,
        avg: total / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }

    return result;
  }

  difficultyCurve(): Array<{ level: number; difficulty: number }> {
    const curve: Array<{ level: number; difficulty: number }> = [];
    for (let i = 1; i <= 10; i++) {
      curve.push({
        level: i,
        difficulty: 1 - Math.exp(-i * 0.3),
      });
    }
    return curve;
  }

  powerFantasy(playerId: string): {
    powerLevel: number;
    fantasyType: string;
    satisfaction: number;
  } | null {
    const player = this._players.get(playerId);
    if (!player) return null;

    const totalSkills = Array.from(player.skills.values()).reduce((s, v) => s + v, 0);
    const totalResources = Array.from(player.resources.values()).reduce((s, v) => s + v, 0);
    const powerLevel = (player.progression * 0.4 + totalSkills * 0.3 + Math.min(1, totalResources / 100) * 0.3);

    let fantasyType = 'explorer';
    if (totalSkills > totalResources && player.progression > 0.5) {
      fantasyType = 'hero';
    } else if (totalResources > totalSkills) {
      fantasyType = 'tycoon';
    } else if (player.actionsTaken > 50) {
      fantasyType = 'warrior';
    }

    return {
      powerLevel: Math.min(1, powerLevel),
      fantasyType,
      satisfaction: powerLevel,
    };
  }

  toPacket(): DataPacket {
    return {
      id: `mechanics-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        mechanics: Array.from(this._mechanics.values()),
        loops: Array.from(this._loops.values()),
        players: Array.from(this._players.values()).map(p => ({
          ...p,
          resources: Object.fromEntries(p.resources),
          skills: Object.fromEntries(p.skills),
        })),
        balanceScore: this._balanceScore,
        emergentGameplay: this.emergentGameplayDetect(),
        totalMechanics: this._mechanics.size,
        totalPlayers: this._players.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ludology', 'GameMechanics'],
        priority: Math.max(1, Math.floor(this._balanceScore * 10)),
        phase: 'gaming',
      },
    };
  }

  reset(): void {
    this._mechanics.clear();
    this._loops.clear();
    this._players.clear();
    this._history = [];
    this._balanceScore = 0.5;
    this._counter = 0;
  }

  get mechanicCount(): number {
    return this._mechanics.size;
  }

  get playerCount(): number {
    return this._players.size;
  }

  get balance(): number {
    return this._balanceScore;
  }

  get history(): string[] {
    return [...this._history];
  }

  createPlayer(name: string): PlayerState {
    const id = `player-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const player: PlayerState = {
      id,
      name,
      resources: new Map(),
      skills: new Map(),
      progression: 0,
      actionsTaken: 0,
      createdAt: Date.now(),
    };
    this._players.set(id, player);
    this._recordHistory(`createPlayer:${name}`);
    return player;
  }

  private _updateBalanceScore(): void {
    if (this._mechanics.size === 0) {
      this._balanceScore = 0.5;
      return;
    }

    const avgBalance = Array.from(this._mechanics.values()).reduce(
      (s, m) => s + m.balance, 0
    ) / this._mechanics.size;

    const typeBalance = this._calculateTypeBalance();
    this._balanceScore = (avgBalance + typeBalance) / 2;
  }

  private _calculateTypeBalance(): number {
    const types: Mechanic['type'][] = ['core', 'secondary', 'metagame'];
    const counts = types.map(t =>
      Array.from(this._mechanics.values()).filter(m => m.type === t).length
    );
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0.5;

    const expected = total / types.length;
    let variance = 0;
    for (const count of counts) {
      variance += Math.pow(count - expected, 2);
    }
    variance /= types.length;
    const normalized = 1 - Math.min(1, variance / Math.pow(expected, 2));
    return normalized;
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
