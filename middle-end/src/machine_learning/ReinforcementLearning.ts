import { DataPacket, PacketMeta } from '../shared/types';

/** Q-table storing state-action values. */
export interface QTable {
  id: string;
  states: number[];
  actions: number[];
  values: Map<string, number>;
  visits: Map<string, number>;
}

/** Stochastic policy mapping states to action probabilities. */
export interface Policy {
  state: number;
  action: number;
  probability: number;
  greedy: boolean;
}

/** A single episode of agent-environment interaction. */
export interface Episode {
  id: number;
  steps: number;
  totalReward: number;
  trajectory: { state: number; action: number; reward: number }[];
}

/** Reinforcement learning environment interface. */
export interface Environment {
  states: number;
  actions: number;
  reset(): number;
  step(state: number, action: number): { nextState: number; reward: number; done: boolean };
}

/** History record for an RL training run. */
interface RLRecord {
  algorithm: string;
  episodes: number;
  avgReward: number;
  bestReward: number;
  timestamp: number;
}

export class ReinforcementLearning {
  private _qTables: Map<string, QTable> = new Map();
  private _policies: Policy[] = [];
  private _episodes: Episode[] = [];
  private _history: RLRecord[] = [];
  private _counter = 0;

  qLearning(env: Environment, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1, episodes: number = 100): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'qlearning');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      let totalReward = 0;
      const trajectory: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = this.epsilonGreedy(qTable, state, epsilon);
        const { nextState, reward, done } = env.step(state, action);
        const oldQ = this._getQ(qTable, state, action);
        const maxNextQ = this._maxQ(qTable, nextState);
        this._setQ(qTable, state, action, oldQ + alpha * (reward + gamma * maxNextQ - oldQ));
        trajectory.push({ state, action, reward });
        totalReward += reward;
        state = nextState;
        if (done) break;
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward, trajectory });
    }
    this._recordHistory('qLearning', episodes);
    return qTable;
  }

  sarsa(env: Environment, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1, episodes: number = 100): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'sarsa');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      let action = this.epsilonGreedy(qTable, state, epsilon);
      let totalReward = 0;
      const trajectory: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const { nextState, reward, done } = env.step(state, action);
        const nextAction = this.epsilonGreedy(qTable, nextState, epsilon);
        const oldQ = this._getQ(qTable, state, action);
        const nextQ = this._getQ(qTable, nextState, nextAction);
        this._setQ(qTable, state, action, oldQ + alpha * (reward + gamma * nextQ - oldQ));
        trajectory.push({ state, action, reward });
        totalReward += reward;
        state = nextState;
        action = nextAction;
        if (done) break;
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward, trajectory });
    }
    this._recordHistory('sarsa', episodes);
    return qTable;
  }

  expectedSarsa(env: Environment, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1, episodes: number = 100): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'expected_sarsa');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      let totalReward = 0;
      const trajectory: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = this.epsilonGreedy(qTable, state, epsilon);
        const { nextState, reward, done } = env.step(state, action);
        const oldQ = this._getQ(qTable, state, action);
        const expectedQ = this._expectedQ(qTable, nextState, epsilon);
        this._setQ(qTable, state, action, oldQ + alpha * (reward + gamma * expectedQ - oldQ));
        trajectory.push({ state, action, reward });
        totalReward += reward;
        state = nextState;
        if (done) break;
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward, trajectory });
    }
    this._recordHistory('expectedSarsa', episodes);
    return qTable;
  }

  dqn(env: Environment, _network: unknown, _replayBuffer: unknown[], batchSize: number, targetUpdate: number): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'dqn');
    for (let i = 0; i < batchSize * targetUpdate; i++) {
      const state = Math.floor(Math.random() * env.states);
      const action = Math.floor(Math.random() * env.actions);
      const { reward } = env.step(state, action);
      this._setQ(qTable, state, action, reward + 0.9 * this._maxQ(qTable, state));
    }
    this._recordHistory('dqn', batchSize);
    return qTable;
  }

  policyGradient(env: Environment, _network: unknown, episodes: number): Policy[] {
    const policies: Policy[] = [];
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      for (let step = 0; step < 100; step++) {
        const action = Math.floor(Math.random() * env.actions);
        const { nextState, reward, done } = env.step(state, action);
        policies.push({ state, action, probability: Math.exp(reward), greedy: reward > 0 });
        state = nextState;
        if (done) break;
      }
    }
    this._policies = policies;
    this._recordHistory('policyGradient', episodes);
    return policies;
  }

  actorCritic(env: Environment, _actor: unknown, _critic: unknown, episodes: number): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'actor_critic');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      for (let step = 0; step < 100; step++) {
        const action = this.epsilonGreedy(qTable, state, 0.1);
        const { nextState, reward, done } = env.step(state, action);
        const tdError = reward + 0.9 * this._maxQ(qTable, nextState) - this._getQ(qTable, state, action);
        this._setQ(qTable, state, action, this._getQ(qTable, state, action) + 0.1 * tdError);
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('actorCritic', episodes);
    return qTable;
  }

  monteCarlo(env: Environment, episodes: number, firstVisit: boolean = true): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'monte_carlo');
    const returns: Map<string, number[]> = new Map();
    for (let e = 0; e < episodes; e++) {
      const trajectory: { state: number; action: number; reward: number }[] = [];
      let state = env.reset();
      for (let step = 0; step < 100; step++) {
        const action = Math.floor(Math.random() * env.actions);
        const { nextState, reward, done } = env.step(state, action);
        trajectory.push({ state, action, reward });
        state = nextState;
        if (done) break;
      }
      let G = 0;
      const visited = new Set<string>();
      for (let t = trajectory.length - 1; t >= 0; t--) {
        G = 0.9 * G + trajectory[t].reward;
        const key = `${trajectory[t].state}-${trajectory[t].action}`;
        if (firstVisit && visited.has(key)) continue;
        visited.add(key);
        if (!returns.has(key)) returns.set(key, []);
        returns.get(key)!.push(G);
        this._setQ(qTable, trajectory[t].state, trajectory[t].action, this._mean(returns.get(key)!));
      }
    }
    this._recordHistory('monteCarlo', episodes);
    return qTable;
  }

  tdLearning(env: Environment, alpha: number, gamma: number, n: number): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'td');
    for (let e = 0; e < 100; e++) {
      let state = env.reset();
      const buffer: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 100; step++) {
        const action = this.epsilonGreedy(qTable, state, 0.1);
        const { nextState, reward, done } = env.step(state, action);
        buffer.push({ state, action, reward });
        if (buffer.length > n) buffer.shift();
        if (buffer.length === n) {
          const G = buffer.reduce((s, t, i) => s + Math.pow(gamma, i) * t.reward, 0) + Math.pow(gamma, n) * this._maxQ(qTable, nextState);
          const oldQ = this._getQ(qTable, buffer[0].state, buffer[0].action);
          this._setQ(qTable, buffer[0].state, buffer[0].action, oldQ + alpha * (G - oldQ));
        }
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('tdLearning', 100);
    return qTable;
  }

  epsilonGreedy(qTable: QTable, state: number, epsilon: number): number {
    if (Math.random() < epsilon) return Math.floor(Math.random() * qTable.actions.length);
    let best = qTable.actions[0];
    let bestQ = -Infinity;
    for (const a of qTable.actions) {
      const q = this._getQ(qTable, state, a);
      if (q > bestQ) { bestQ = q; best = a; }
    }
    return best;
  }

  softmaxPolicy(qValues: number[], tau: number): number {
    const exp = qValues.map(q => Math.exp(q / tau));
    const sum = exp.reduce((s, v) => s + v, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < exp.length; i++) {
      r -= exp[i];
      if (r <= 0) return i;
    }
    return exp.length - 1;
  }

  valueIteration(env: Environment, gamma: number, theta: number): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'value_iteration');
    let delta = Infinity;
    while (delta > theta) {
      delta = 0;
      for (const s of qTable.states) {
        for (const a of qTable.actions) {
          const { nextState, reward } = env.step(s, a);
          const oldQ = this._getQ(qTable, s, a);
          const newQ = reward + gamma * this._maxQ(qTable, nextState);
          this._setQ(qTable, s, a, newQ);
          delta = Math.max(delta, Math.abs(oldQ - newQ));
        }
      }
    }
    this._recordHistory('valueIteration', 1);
    return qTable;
  }

  policyIteration(env: Environment, gamma: number): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'policy_iteration');
    let policyStable = false;
    while (!policyStable) {
      policyStable = true;
      for (const s of qTable.states) {
        const oldAction = this.epsilonGreedy(qTable, s, 0);
        for (const a of qTable.actions) {
          const { nextState, reward } = env.step(s, a);
          this._setQ(qTable, s, a, reward + gamma * this._maxQ(qTable, nextState));
        }
        const newAction = this.epsilonGreedy(qTable, s, 0);
        if (newAction !== oldAction) policyStable = false;
      }
    }
    this._recordHistory('policyIteration', 1);
    return qTable;
  }

  bellmanEquation(state: number, action: number, env: Environment, gamma: number): number {
    const { nextState, reward } = env.step(state, action);
    return reward + gamma * this._maxQ(this._initQTable(env.states, env.actions, 'bellman'), nextState);
  }

  toPacket(): DataPacket<{ qTables: Map<string, QTable>; policies: Policy[]; episodes: Episode[]; history: RLRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['machine_learning', 'ReinforcementLearning'],
      priority: 1,
      phase: 'reinforcement_learning',
    };
    return {
      id: `rl-${Date.now().toString(36)}`,
      payload: { qTables: this._qTables, policies: this._policies, episodes: this._episodes, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._qTables = new Map();
    this._policies = [];
    this._episodes = [];
    this._history = [];
    this._counter = 0;
  }

  get qTableCount(): number { return this._qTables.size; }
  get policyCount(): number { return this._policies.length; }
  get episodeCount(): number { return this._episodes.length; }

  private _initQTable(states: number, actions: number, algorithm: string): QTable {
    const qTable: QTable = {
      id: `q-${algorithm}-${++this._counter}-${Date.now().toString(36)}`,
      states: Array.from({ length: states }, (_, i) => i),
      actions: Array.from({ length: actions }, (_, i) => i),
      values: new Map(),
      visits: new Map(),
    };
    this._qTables.set(qTable.id, qTable);
    return qTable;
  }

  private _getQ(qTable: QTable, state: number, action: number): number {
    return qTable.values.get(`${state}-${action}`) ?? 0;
  }

  private _setQ(qTable: QTable, state: number, action: number, value: number): void {
    qTable.values.set(`${state}-${action}`, value);
    qTable.visits.set(`${state}-${action}`, (qTable.visits.get(`${state}-${action}`) ?? 0) + 1);
  }

  private _maxQ(qTable: QTable, state: number): number {
    return Math.max(...qTable.actions.map(a => this._getQ(qTable, state, a)));
  }

  private _expectedQ(qTable: QTable, state: number, epsilon: number): number {
    const qs = qTable.actions.map(a => this._getQ(qTable, state, a));
    const maxQ = Math.max(...qs);
    const greedyIdx = qs.indexOf(maxQ);
    const n = qs.length;
    return qs.reduce((s, q, i) => s + (i === greedyIdx ? (1 - epsilon + epsilon / n) * q : (epsilon / n) * q), 0);
  }

  private _mean(v: number[]): number {
    return v.length === 0 ? 0 : v.reduce((s, x) => s + x, 0) / v.length;
  }

  private _recordHistory(algorithm: string, episodes: number): void {
    const recent = this._episodes.slice(-episodes);
    const avgReward = this._mean(recent.map(e => e.totalReward));
    const bestReward = recent.length === 0 ? 0 : Math.max(...recent.map(e => e.totalReward));
    this._history.push({ algorithm, episodes, avgReward, bestReward, timestamp: Date.now() });
  }
}
