export interface CollapseScenario {
  id: string;
  name: string;
  trigger: string;
  probability: number;
  severity: number;
  simulatedAt: number;
}

export interface EscapePath {
  id: string;
  scenarioId: string;
  steps: string[];
  viability: number;
  generatedAt: number;
}

export type SimulationOutcome = 'collapsed' | 'escaped' | 'partial';

export interface SimulationRun {
  id: string;
  scenarioId: string;
  outcome: SimulationOutcome;
  duration: number;
  runAt: number;
}

interface PropagationNode {
  id: string;
  criticality: number;
  neighbors: Map<string, number>;
}

export class EschatologicalEngine {
  private _scenarios: Map<string, CollapseScenario> = new Map();
  private _escapePaths: Map<string, EscapePath[]> = new Map();
  private _simulations: SimulationRun[] = [];
  private _graphs: Map<string, Map<string, PropagationNode>> = new Map();
  private _idCounter = 0;
  private _autoGenerate = true;
  private _minViability = 0.4;
  private _nodeCount = 7;
  private _mcmcIter = 300;

  registerScenario(name: string, trigger: string, probability: number, severity: number): CollapseScenario {
    if (probability < 0 || probability > 1) throw new Error('Probability must be in [0,1]');
    if (severity < 0 || severity > 1) throw new Error('Severity must be in [0,1]');
    const id = `collapse-${++this._idCounter}-${Date.now()}`;
    const scenario: CollapseScenario = { id, name, trigger, probability, severity, simulatedAt: Date.now() };
    this._scenarios.set(id, scenario);
    this._escapePaths.set(id, []);
    this._buildGraph(id, severity);
    if (this._autoGenerate) this.generateEscapePaths(id, 2);
    return scenario;
  }

  generateEscapePaths(scenarioId: string, count: number = 1): EscapePath[] {
    const scenario = this._scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
    const graph = this._graphs.get(scenarioId);
    if (!graph) throw new Error(`Graph not found for ${scenarioId}`);
    const paths: EscapePath[] = [];
    const existing = this._escapePaths.get(scenarioId) || [];
    const nodes = Array.from(graph.values());
    const collapseProbs = this._mcmcDistribution(scenarioId);
    for (let i = 0; i < count; i++) {
      const result = this._maxSurvivalPath(graph, nodes[0].id, nodes[nodes.length - 1].id, collapseProbs, existing.length + i);
      const viability = Math.max(this._minViability, Math.min(0.98, result.survivalProb));
      const path: EscapePath = {
        id: `escape-${++this._idCounter}-${Date.now()}`,
        scenarioId,
        steps: this._makeSteps(scenario, result.steps, viability),
        viability,
        generatedAt: Date.now(),
      };
      paths.push(path);
    }
    existing.push(...paths);
    this._escapePaths.set(scenarioId, existing);
    return paths;
  }

  simulate(scenarioId: string, escapePathId?: string): SimulationRun {
    const scenario = this._scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
    const paths = this._escapePaths.get(scenarioId) || [];
    const path = escapePathId ? paths.find(p => p.id === escapePathId) : paths[0];
    let escapeChance = 0;
    if (path) {
      const collapseVec = this._mcmcVector(scenarioId, scenario.severity);
      let risk = 0;
      for (let i = 0; i < path.steps.length; i++) {
        risk += collapseVec[i % collapseVec.length] * (1 - path.viability) / path.steps.length;
      }
      escapeChance = Math.max(0, Math.min(1, path.viability - risk * scenario.severity));
    }
    const roll = Math.random();
    let outcome: SimulationOutcome;
    if (roll < escapeChance * scenario.probability) outcome = 'escaped';
    else if (roll < escapeChance * scenario.probability + 0.15) outcome = 'partial';
    else outcome = 'collapsed';
    const run: SimulationRun = {
      id: `sim-${++this._idCounter}-${Date.now()}`,
      scenarioId,
      outcome,
      duration: Math.floor(200 + scenario.severity * 800 + Math.random() * 200),
      runAt: Date.now(),
    };
    this._simulations.push(run);
    return run;
  }

  runAllSimulations(): SimulationRun[] {
    const results: SimulationRun[] = [];
    for (const id of this._scenarios.keys()) results.push(this.simulate(id));
    return results;
  }

  setAutoGenerate(auto: boolean): void { this._autoGenerate = auto; }

  setMinViability(v: number): void {
    if (v < 0 || v > 1) throw new Error('Viability must be in [0,1]');
    this._minViability = v;
  }

  getScenarios(): CollapseScenario[] { return Array.from(this._scenarios.values()); }

  getEscapePaths(scenarioId: string): EscapePath[] {
    return [...(this._escapePaths.get(scenarioId) || [])];
  }

  getBestEscapePath(scenarioId: string): EscapePath | null {
    const paths = this._escapePaths.get(scenarioId) || [];
    if (paths.length === 0) return null;
    return paths.reduce((best, p) => p.viability > best.viability ? p : best);
  }

  get simulations(): SimulationRun[] { return [...this._simulations]; }
  get autoGenerate(): boolean { return this._autoGenerate; }
  get minViability(): number { return this._minViability; }
  get scenarioCount(): number { return this._scenarios.size; }

  private _buildGraph(scenarioId: string, severity: number): void {
    const graph = new Map<string, PropagationNode>();
    for (let i = 0; i < this._nodeCount; i++) {
      graph.set(`n${i}`, {
        id: `n${i}`,
        criticality: 0.3 + Math.sin(i * 0.7 + severity) * 0.35 + 0.35,
        neighbors: new Map(),
      });
    }
    const nodes = Array.from(graph.values());
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i !== j && Math.random() < 0.3 + severity * 0.25) {
          nodes[i].neighbors.set(nodes[j].id, 0.1 + Math.random() * 0.6 * severity);
        }
      }
      if (i < nodes.length - 1) {
        nodes[i].neighbors.set(nodes[i + 1].id, 0.4 + severity * 0.3);
      }
    }
    this._graphs.set(scenarioId, graph);
  }

  private _mcmcDistribution(scenarioId: string): Map<string, number> {
    const graph = this._graphs.get(scenarioId)!;
    const scenario = this._scenarios.get(scenarioId)!;
    const probs = new Map<string, number>();
    const ids = Array.from(graph.keys());
    for (const id of ids) probs.set(id, scenario.severity * 0.3);
    let cur = ids[0];
    for (let iter = 0; iter < this._mcmcIter; iter++) {
      const node = graph.get(cur)!;
      const neighbors = Array.from(node.neighbors.keys());
      if (neighbors.length > 0 && Math.random() < node.criticality * scenario.severity) {
        const total = neighbors.reduce((s, n) => s + node.neighbors.get(n)!, 0);
        let r = Math.random() * total;
        for (const n of neighbors) {
          r -= node.neighbors.get(n)!;
          if (r <= 0) { cur = n; probs.set(n, Math.min(0.99, probs.get(n)! + node.criticality * 0.01)); break; }
        }
      }
    }
    return probs;
  }

  private _mcmcVector(scenarioId: string, severity: number): number[] {
    const graph = this._graphs.get(scenarioId)!;
    const ids = Array.from(graph.keys());
    const state = ids.map(() => severity * 0.2);
    let active = Math.floor(Math.random() * ids.length);
    for (let i = 0; i < ids.length * 3; i++) {
      const node = graph.get(ids[active])!;
      state[active] = Math.min(0.99, state[active] + node.criticality * 0.08);
      const nb = Array.from(node.neighbors.keys());
      if (nb.length > 0) active = ids.indexOf(nb[Math.floor(Math.random() * nb.length)]);
    }
    return state;
  }

  private _maxSurvivalPath(graph: Map<string, PropagationNode>, start: string, end: string, collapseProbs: Map<string, number>, attempt: number): { survivalProb: number; steps: string[] } {
    const survival = new Map<string, number>();
    const prev = new Map<string, string | null>();
    for (const id of graph.keys()) { survival.set(id, -Infinity); prev.set(id, null); }
    survival.set(start, Math.log(1 - (collapseProbs.get(start) || 0.5) + 1e-9));
    const pq: { id: string; prob: number }[] = [{ id: start, prob: survival.get(start)! }];
    while (pq.length > 0) {
      pq.sort((a, b) => b.prob - a.prob);
      const cur = pq.shift()!;
      if (cur.id === end) break;
      const node = graph.get(cur.id)!;
      for (const [neighbor, weight] of node.neighbors) {
        const risk = collapseProbs.get(neighbor) || 0.5;
        const edgeSurv = (1 - weight) * (1 - risk * 0.5);
        const newProb = cur.prob + Math.log(edgeSurv + 1e-9);
        if (newProb > survival.get(neighbor)!) {
          survival.set(neighbor, newProb);
          prev.set(neighbor, cur.id);
          pq.push({ id: neighbor, prob: newProb });
        }
      }
    }
    const steps: string[] = [];
    let c: string | null = end;
    while (c !== null) {
      const node = graph.get(c)!;
      steps.unshift(`bypass ${c} (crit ${node.criticality.toFixed(2)})`);
      c = prev.get(c) || null;
    }
    const boost = Math.min(0.15, attempt * 0.04);
    return { survivalProb: Math.exp(survival.get(end) || -5) + boost, steps };
  }

  private _makeSteps(scenario: CollapseScenario, pathSteps: string[], viability: number): string[] {
    const steps: string[] = [`detect trigger: ${scenario.trigger}`];
    for (let i = 0; i < pathSteps.length; i++) {
      steps.push(i % 2 === 0 ? `phase ${i / 2 + 1}: ${pathSteps[i]}` : `reinforce: ${pathSteps[i]}`);
    }
    if (viability > 0.8) steps.push('full system restoration');
    else if (viability > 0.6) steps.push('graceful degradation with recovery');
    else if (viability > 0.45) steps.push('minimal operational mode');
    else steps.push('emergency containment only');
    return steps;
  }
}
