import { DataPacket, Signal } from '../shared/types';

export interface OrganizationState {
  entropy: number;
  order: number;
  complexity: number;
  emergenceLevel: number;
  structureCount: number;
  interactions: number;
  timestamp: number;
}

export interface Agent {
  id: number;
  state: number;
  neighbors: number[];
  internalEnergy: number;
}

export interface Structure {
  id: string;
  size: number;
  coherence: number;
  lifetime: number;
  birthTime: number;
}

export class SelfOrganization {
  private _agents: Agent[];
  private _structures: Structure[];
  private _entropy: number;
  private _order: number;
  private _emergenceLevel: number;
  private _history: OrganizationState[];
  private _timeStep: number;
  private _interactionRadius: number;
  private _noiseLevel: number;
  private _couplingStrength: number;

  constructor(agentCount: number = 100) {
    this._agents = [];
    this._structures = [];
    this._entropy = 1.0;
    this._order = 0;
    this._emergenceLevel = 0;
    this._history = [];
    this._timeStep = 0;
    this._interactionRadius = 5;
    this._noiseLevel = 0.1;
    this._couplingStrength = 0.3;

    for (let i = 0; i < agentCount; i++) {
      this._agents.push({
        id: i,
        state: Math.random() * 2 - 1,
        neighbors: [],
        internalEnergy: Math.random()
      });
    }
    this._initializeNeighbors();
  }

  get entropy(): number { return this._entropy; }
  get order(): number { return this._order; }
  get emergenceLevel(): number { return this._emergenceLevel; }
  get agentCount(): number { return this._agents.length; }
  get structureCount(): number { return this._structures.length; }

  public setInteractionRadius(radius: number): void {
    this._interactionRadius = Math.max(1, radius);
    this._initializeNeighbors();
  }

  public setNoiseLevel(level: number): void {
    this._noiseLevel = Math.max(0, Math.min(1, level));
  }

  public setCouplingStrength(strength: number): void {
    this._couplingStrength = Math.max(0, Math.min(1, strength));
  }

  private _initializeNeighbors(): void {
    const n = this._agents.length;
    const r = Math.floor(this._interactionRadius);
    for (let i = 0; i < n; i++) {
      this._agents[i].neighbors = [];
      for (let j = 1; j <= r; j++) {
        this._agents[i].neighbors.push((i + j) % n);
        this._agents[i].neighbors.push((i - j + n) % n);
      }
    }
  }

  public setAgentState(index: number, state: number): void {
    if (index >= 0 && index < this._agents.length) {
      this._agents[index].state = state;
    }
  }

  public addAgent(): number {
    const newAgent: Agent = {
      id: this._agents.length,
      state: Math.random() * 2 - 1,
      neighbors: [],
      internalEnergy: Math.random()
    };
    this._agents.push(newAgent);
    this._initializeNeighbors();
    return newAgent.id;
  }

  public removeAgent(id: number): boolean {
    const index = this._agents.findIndex(a => a.id === id);
    if (index === -1) return false;
    this._agents.splice(index, 1);
    this._initializeNeighbors();
    return true;
  }

  public step(): OrganizationState {
    this._timeStep++;

    const newStates: number[] = new Array(this._agents.length);
    let totalInteraction = 0;

    for (let i = 0; i < this._agents.length; i++) {
      const agent = this._agents[i];
      let neighborInfluence = 0;
      for (const n of agent.neighbors) {
        neighborInfluence += this._agents[n].state;
      }
      const avgNeighbor = agent.neighbors.length > 0 ? neighborInfluence / agent.neighbors.length : 0;

      const noise = (Math.random() * 2 - 1) * this._noiseLevel;
      const coupling = this._couplingStrength * avgNeighbor;

      let newState = agent.state + coupling + noise;
      newState = Math.tanh(newState * 2);

      newStates[i] = newState;
      totalInteraction += Math.abs(agent.state - avgNeighbor);
    }

    for (let i = 0; i < this._agents.length; i++) {
      this._agents[i].state = newStates[i];
      this._agents[i].internalEnergy = Math.abs(newStates[i]);
    }

    this._updateEntropy();
    this._updateOrder();
    this._detectStructures();
    this._updateEmergence();

    const state: OrganizationState = {
      entropy: this._entropy,
      order: this._order,
      complexity: this._calculateComplexity(),
      emergenceLevel: this._emergenceLevel,
      structureCount: this._structures.length,
      interactions: totalInteraction,
      timestamp: this._timeStep
    };

    this._history.push(state);
    return state;
  }

  private _updateEntropy(): void {
    const states = this._agents.map(a => a.state);
    const bins = 20;
    const counts = new Array(bins).fill(0);

    for (const s of states) {
      const bin = Math.min(bins - 1, Math.floor((s + 1) / 2 * bins));
      counts[bin]++;
    }

    let entropy = 0;
    const n = states.length;
    for (const count of counts) {
      if (count > 0) {
        const p = count / n;
        entropy -= p * Math.log(p);
      }
    }

    const maxEntropy = Math.log(bins);
    this._entropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private _updateOrder(): void {
    if (this._agents.length === 0) {
      this._order = 0;
      return;
    }
    const meanState = this._agents.reduce((s, a) => s + a.state, 0) / this._agents.length;
    this._order = Math.abs(meanState);
  }

  private _calculateComplexity(): number {
    return this._entropy * this._order * 4;
  }

  private _detectStructures(): void {
    const threshold = 0.7;
    const visited = new Set<number>();
    const newStructures: Structure[] = [];

    for (let i = 0; i < this._agents.length; i++) {
      if (visited.has(i) || Math.abs(this._agents[i].state) < threshold) continue;

      const cluster: number[] = [];
      const stack = [i];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        visited.add(current);
        cluster.push(current);

        for (const n of this._agents[current].neighbors) {
          if (!visited.has(n) && Math.abs(this._agents[n].state) >= threshold) {
            stack.push(n);
          }
        }
      }

      if (cluster.length >= 3) {
        const coherence = cluster.reduce((s, idx) => s + Math.abs(this._agents[idx].state), 0) / cluster.length;
        newStructures.push({
          id: `struct-${this._timeStep}-${newStructures.length}`,
          size: cluster.length,
          coherence,
          lifetime: 1,
          birthTime: this._timeStep
        });
      }
    }

    this._structures = newStructures;
  }

  private _updateEmergence(): void {
    if (this._history.length < 2) {
      this._emergenceLevel = 0;
      return;
    }

    const prev = this._history[this._history.length - 1];
    const complexityChange = this._calculateComplexity() - prev.complexity;
    const structureChange = this._structures.length - prev.structureCount;

    this._emergenceLevel = Math.max(0, Math.min(1,
      this._emergenceLevel + 0.1 * (complexityChange + structureChange * 0.1)
    ));
  }

  public simulate(steps: number): OrganizationState[] {
    const results: OrganizationState[] = [];
    for (let i = 0; i < steps; i++) {
      results.push(this.step());
    }
    return results;
  }

  public isSelfOrganized(): boolean {
    return this._order > 0.5 && this._entropy > 0.3 && this._structures.length > 0;
  }

  public phaseTransitionPoint(noiseValues: number[]): { criticalNoise: number; maxComplexity: number } {
    let maxComplexity = 0;
    let criticalNoise = 0;
    const originalNoise = this._noiseLevel;

    for (const noise of noiseValues) {
      this._noiseLevel = noise;
      this.reset();
      this.simulate(50);
      const complexity = this._calculateComplexity();
      if (complexity > maxComplexity) {
        maxComplexity = complexity;
        criticalNoise = noise;
      }
    }

    this._noiseLevel = originalNoise;
    return { criticalNoise, maxComplexity };
  }

  public calculateLyapunov(perturbation: number = 0.001): number {
    const originalStates = this._agents.map(a => a.state);

    if (this._agents.length > 0) {
      this._agents[0].state += perturbation;
    }

    this.step();

    let divergence = 0;
    for (let i = 0; i < this._agents.length; i++) {
      divergence += Math.abs(this._agents[i].state - originalStates[i]);
    }
    divergence /= this._agents.length;

    const lyapunov = Math.log(Math.max(divergence / perturbation, 1e-10));
    return lyapunov;
  }

  public emergenceToPacket(): DataPacket<Signal> {
    return {
      id: `emergence-${Date.now()}`,
      payload: {
        source: 'self-organization',
        magnitude: this._emergenceLevel,
        entropy: this._entropy,
        timestamp: Date.now()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['complexity', 'self-organization'],
        priority: 0.6,
        phase: 'emerging'
      }
    };
  }

  public reset(): void {
    for (const agent of this._agents) {
      agent.state = Math.random() * 2 - 1;
      agent.internalEnergy = Math.random();
    }
    this._structures = [];
    this._entropy = 1.0;
    this._order = 0;
    this._emergenceLevel = 0;
    this._history = [];
    this._timeStep = 0;
  }

  public getHistory(): OrganizationState[] {
    return [...this._history];
  }

  public getAgentStates(): number[] {
    return this._agents.map(a => a.state);
  }

  public getStructures(): Structure[] {
    return this._structures.map(s => ({ ...s }));
  }
}
