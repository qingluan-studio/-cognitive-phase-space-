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

  // ---------------------------------------------------------------------------
  // Q-Learning variants and improvements
  // ---------------------------------------------------------------------------

  /** Double Q-Learning (reduces overestimation bias using two Q-tables). */
  doubleQLearning(env: Environment, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1, episodes: number = 100): { qA: QTable; qB: QTable } {
    const qA = this._initQTable(env.states, env.actions, 'dqA');
    const qB = this._initQTable(env.states, env.actions, 'dqB');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      let totalReward = 0;
      const trajectory: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const combinedQ = qA.actions.map(a => this._getQ(qA, state, a) + this._getQ(qB, state, a));
        const action = Math.random() < epsilon
          ? Math.floor(Math.random() * qA.actions.length)
          : combinedQ.indexOf(Math.max(...combinedQ));
        const { nextState, reward, done } = env.step(state, action);
        if (Math.random() < 0.5) {
          const bestA = this._argmaxQ(qA, nextState);
          const oldQ = this._getQ(qA, state, action);
          const target = reward + gamma * this._getQ(qB, nextState, bestA);
          this._setQ(qA, state, action, oldQ + alpha * (target - oldQ));
        } else {
          const bestB = this._argmaxQ(qB, nextState);
          const oldQ = this._getQ(qB, state, action);
          const target = reward + gamma * this._getQ(qA, nextState, bestB);
          this._setQ(qB, state, action, oldQ + alpha * (target - oldQ));
        }
        trajectory.push({ state, action, reward });
        totalReward += reward;
        state = nextState;
        if (done) break;
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward, trajectory });
    }
    this._recordHistory('doubleQLearning', episodes);
    return { qA, qB };
  }

  /** SARSA(λ) with eligibility traces. */
  sarsaLambda(env: Environment, alpha: number = 0.1, gamma: number = 0.9, lambda: number = 0.9, epsilon: number = 0.1, episodes: number = 100): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'sarsa_lambda');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      let action = this.epsilonGreedy(qTable, state, epsilon);
      const eligibility = new Map<string, number>();
      for (let step = 0; step < 1000; step++) {
        const { nextState, reward, done } = env.step(state, action);
        const nextAction = this.epsilonGreedy(qTable, nextState, epsilon);
        const tdError = reward + gamma * this._getQ(qTable, nextState, nextAction) - this._getQ(qTable, state, action);
        const key = `${state}-${action}`;
        eligibility.set(key, (eligibility.get(key) ?? 0) + 1);
        for (const [k, e2] of eligibility) {
          const [s, a] = k.split('-').map(Number);
          this._setQ(qTable, s, a, this._getQ(qTable, s, a) + alpha * tdError * e2);
          eligibility.set(k, gamma * lambda * e2);
        }
        state = nextState;
        action = nextAction;
        if (done) break;
      }
    }
    this._recordHistory('sarsaLambda', episodes);
    return qTable;
  }

  /** Watkins' Q(λ) - off-policy Q-learning with eligibility traces. */
  watkinsQLambda(env: Environment, alpha: number = 0.1, gamma: number = 0.9, lambda: number = 0.9, epsilon: number = 0.1, episodes: number = 100): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'watkins_q_lambda');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const eligibility = new Map<string, number>();
      for (let step = 0; step < 1000; step++) {
        const action = this.epsilonGreedy(qTable, state, epsilon);
        const { nextState, reward, done } = env.step(state, action);
        const bestNext = this._argmaxQ(qTable, nextState);
        const tdError = reward + gamma * this._getQ(qTable, nextState, bestNext) - this._getQ(qTable, state, action);
        const key = `${state}-${action}`;
        eligibility.set(key, (eligibility.get(key) ?? 0) + 1);
        for (const [k, e2] of eligibility) {
          const [s, a] = k.split('-').map(Number);
          this._setQ(qTable, s, a, this._getQ(qTable, s, a) + alpha * tdError * e2);
          if (action === bestNext) {
            eligibility.set(k, gamma * lambda * e2);
          } else {
            eligibility.set(k, 0);
          }
        }
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('watkinsQLambda', episodes);
    return qTable;
  }

  /** True online SARSA(λ) - more accurate version with Dutch traces. */
  trueOnlineSarsaLambda(env: Environment, alpha: number = 0.1, gamma: number = 0.9, lambda: number = 0.9, epsilon: number = 0.1, episodes: number = 100): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'true_online_sarsa_lambda');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      let action = this.epsilonGreedy(qTable, state, epsilon);
      let qOld = this._getQ(qTable, state, action);
      const eligibility = new Map<string, number>();
      for (let step = 0; step < 1000; step++) {
        const { nextState, reward, done } = env.step(state, action);
        const nextAction = this.epsilonGreedy(qTable, nextState, epsilon);
        const q = this._getQ(qTable, state, action);
        const qNext = this._getQ(qTable, nextState, nextAction);
        const tdError = reward + gamma * qNext - q;
        const key = `${state}-${action}`;
        const prevElig = eligibility.get(key) ?? 0;
        eligibility.set(key, prevElig + 1);
        for (const [k, e2] of eligibility) {
          const [s, a] = k.split('-').map(Number);
          this._setQ(qTable, s, a, this._getQ(qTable, s, a) + alpha * (tdError + q - qOld) * e2);
          eligibility.set(k, gamma * lambda * e2);
        }
        const curElig = eligibility.get(key) ?? 0;
        this._setQ(qTable, state, action, this._getQ(qTable, state, action) - alpha * (q - qOld) * curElig);
        qOld = qNext;
        state = nextState;
        action = nextAction;
        if (done) break;
      }
    }
    this._recordHistory('trueOnlineSarsaLambda', episodes);
    return qTable;
  }

  /** N-step Q-learning. */
  nStepQLearning(env: Environment, n: number, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1, episodes: number = 100): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'n_step_q');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const buffer: { state: number; action: number; reward: number }[] = [];
      const T = 1000;
      let t = 0;
      let tau = 0;
      while (tau < T - 1) {
        if (t < T) {
          const action = this.epsilonGreedy(qTable, state, epsilon);
          const { nextState, reward, done } = env.step(state, action);
          buffer.push({ state, action, reward });
          state = nextState;
          if (done) break;
        }
        tau = t - n + 1;
        if (tau >= 0) {
          const G = this._nStepReturn(buffer, tau, n, gamma, qTable);
          const oldQ = this._getQ(qTable, buffer[tau].state, buffer[tau].action);
          this._setQ(qTable, buffer[tau].state, buffer[tau].action, oldQ + alpha * (G - oldQ));
        }
        t++;
      }
    }
    this._recordHistory('nStepQLearning', episodes);
    return qTable;
  }

  /** Tree backup algorithm (off-policy without importance sampling). */
  treeBackup(env: Environment, n: number, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1, episodes: number = 100): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'tree_backup');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const buffer: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = this.epsilonGreedy(qTable, state, epsilon);
        const { nextState, reward, done } = env.step(state, action);
        buffer.push({ state, action, reward });
        if (buffer.length > n) buffer.shift();
        if (buffer.length === n) {
          let G = 0;
          for (let i = buffer.length - 1; i >= 0; i--) {
            G = buffer[i].reward + gamma * G;
            const expected = this._expectedQ(qTable, buffer[i].state, epsilon);
            G = (1 - epsilon) * G + epsilon * expected;
          }
          const oldQ = this._getQ(qTable, buffer[0].state, buffer[0].action);
          this._setQ(qTable, buffer[0].state, buffer[0].action, oldQ + alpha * (G - oldQ));
        }
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('treeBackup', episodes);
    return qTable;
  }

  /** Q(sigma) algorithm - unifies Q-learning and SARSA via sigma parameter. */
  qSigma(env: Environment, sigma: number, n: number, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1, episodes: number = 100): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'q_sigma');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const buffer: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = this.epsilonGreedy(qTable, state, epsilon);
        const { nextState, reward, done } = env.step(state, action);
        buffer.push({ state, action, reward });
        if (buffer.length > n) buffer.shift();
        if (buffer.length === n) {
          let G = 0;
          for (let i = buffer.length - 1; i >= 0; i--) {
            const expected = this._expectedQ(qTable, buffer[i].state, epsilon);
            G = sigma * (buffer[i].reward + gamma * this._getQ(qTable, buffer[i].state, buffer[i].action)) +
                (1 - sigma) * (buffer[i].reward + gamma * expected);
          }
          const oldQ = this._getQ(qTable, buffer[0].state, buffer[0].action);
          this._setQ(qTable, buffer[0].state, buffer[0].action, oldQ + alpha * (G - oldQ));
        }
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('qSigma', episodes);
    return qTable;
  }

  // ---------------------------------------------------------------------------
  // Policy gradient methods
  // ---------------------------------------------------------------------------

  /** REINFORCE (Monte Carlo policy gradient with returns). */
  reinforce(env: Environment, theta: number[], episodes: number = 100, lr: number = 0.01, gamma: number = 0.9): number[] {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const trajectory: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = this._samplePolicy(theta, state, env.actions);
        const { nextState, reward, done } = env.step(state, action);
        trajectory.push({ state, action, reward });
        state = nextState;
        if (done) break;
      }
      let G = 0;
      for (let t = trajectory.length - 1; t >= 0; t--) {
        G = gamma * G + trajectory[t].reward;
        const grad = this._policyGradient(theta, trajectory[t].state, trajectory[t].action, env.actions);
        for (let i = 0; i < theta.length; i++) theta[i] += lr * G * grad[i];
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward: trajectory.reduce((s, t) => s + t.reward, 0), trajectory });
    }
    this._recordHistory('reinforce', episodes);
    return theta;
  }

  /** REINFORCE with baseline (variance reduction). */
  reinforceWithBaseline(env: Environment, theta: number[], w: number[], episodes: number = 100, lr: number = 0.01, gamma: number = 0.9): { theta: number[]; w: number[] } {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const trajectory: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = this._samplePolicy(theta, state, env.actions);
        const { nextState, reward, done } = env.step(state, action);
        trajectory.push({ state, action, reward });
        state = nextState;
        if (done) break;
      }
      let G = 0;
      for (let t = trajectory.length - 1; t >= 0; t--) {
        G = gamma * G + trajectory[t].reward;
        const v = w[trajectory[t].state] ?? 0;
        const delta = G - v;
        w[trajectory[t].state] = (w[trajectory[t].state] ?? 0) + lr * delta;
        const grad = this._policyGradient(theta, trajectory[t].state, trajectory[t].action, env.actions);
        for (let i = 0; i < theta.length; i++) theta[i] += lr * delta * grad[i];
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward: trajectory.reduce((s, t) => s + t.reward, 0), trajectory });
    }
    this._recordHistory('reinforceWithBaseline', episodes);
    return { theta, w };
  }

  /** A2C (Advantage Actor-Critic). */
  a2c(env: Environment, theta: number[], w: number[], episodes: number = 100, lr: number = 0.01, gamma: number = 0.9): { theta: number[]; w: number[] } {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const trajectory: { state: number; action: number; reward: number; value: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = this._samplePolicy(theta, state, env.actions);
        const { nextState, reward, done } = env.step(state, action);
        const value = w[state] ?? 0;
        trajectory.push({ state, action, reward, value });
        state = nextState;
        if (done) break;
      }
      let R = 0;
      for (let t = trajectory.length - 1; t >= 0; t--) {
        R = gamma * R + trajectory[t].reward;
        const delta = R - (w[trajectory[t].state] ?? 0);
        w[trajectory[t].state] = (w[trajectory[t].state] ?? 0) + lr * delta;
        const grad = this._policyGradient(theta, trajectory[t].state, trajectory[t].action, env.actions);
        for (let i = 0; i < theta.length; i++) theta[i] += lr * delta * grad[i];
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward: trajectory.reduce((s, t) => s + t.reward, 0), trajectory: trajectory.map(t => ({ state: t.state, action: t.action, reward: t.reward })) });
    }
    this._recordHistory('a2c', episodes);
    return { theta, w };
  }

  /** PPO (Proximal Policy Optimization) - clipped surrogate objective. */
  ppo(env: Environment, theta: number[], w: number[], episodes: number = 100, lr: number = 0.01, gamma: number = 0.9, clipEps: number = 0.2, nUpdates: number = 4): { theta: number[]; w: number[] } {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const trajectory: { state: number; action: number; reward: number; logProb: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = this._samplePolicy(theta, state, env.actions);
        const logProb = this._logProb(theta, state, action, env.actions);
        const { nextState, reward, done } = env.step(state, action);
        trajectory.push({ state, action, reward, logProb });
        state = nextState;
        if (done) break;
      }
      const returns: number[] = [];
      let R = 0;
      for (let t = trajectory.length - 1; t >= 0; t--) {
        R = gamma * R + trajectory[t].reward;
        returns.unshift(R);
      }
      for (let u = 0; u < nUpdates; u++) {
        for (let t = 0; t < trajectory.length; t++) {
          const value = w[trajectory[t].state] ?? 0;
          const advantage = returns[t] - value;
          w[trajectory[t].state] = value + lr * advantage;
          const newLogProb = this._logProb(theta, trajectory[t].state, trajectory[t].action, env.actions);
          const ratio = Math.exp(newLogProb - trajectory[t].logProb);
          const clipped = Math.min(ratio * advantage, Math.max(1 - clipEps, Math.min(1 + clipEps, ratio * advantage)) * Math.sign(advantage) * Math.abs(advantage));
          const grad = this._policyGradient(theta, trajectory[t].state, trajectory[t].action, env.actions);
          for (let i = 0; i < theta.length; i++) theta[i] += lr * clipped * grad[i];
        }
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward: trajectory.reduce((s, t) => s + t.reward, 0), trajectory: trajectory.map(t => ({ state: t.state, action: t.action, reward: t.reward })) });
    }
    this._recordHistory('ppo', episodes);
    return { theta, w };
  }

  /** TRPO (Trust Region Policy Optimization) - simplified version. */
  trpo(env: Environment, theta: number[], w: number[], episodes: number = 100, gamma: number = 0.9, maxKl: number = 0.01): { theta: number[]; w: number[] } {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const trajectory: { state: number; action: number; reward: number; logProb: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = this._samplePolicy(theta, state, env.actions);
        const logProb = this._logProb(theta, state, action, env.actions);
        const { nextState, reward, done } = env.step(state, action);
        trajectory.push({ state, action, reward, logProb });
        state = nextState;
        if (done) break;
      }
      const returns: number[] = [];
      let R = 0;
      for (let t = trajectory.length - 1; t >= 0; t--) {
        R = gamma * R + trajectory[t].reward;
        returns.unshift(R);
      }
      // Compute gradients and update with line search to satisfy KL constraint (simplified)
      const oldTheta = [...theta];
      for (let t = 0; t < trajectory.length; t++) {
        const value = w[trajectory[t].state] ?? 0;
        const advantage = returns[t] - value;
        w[trajectory[t].state] = value + 0.01 * advantage;
        const grad = this._policyGradient(theta, trajectory[t].state, trajectory[t].action, env.actions);
        for (let i = 0; i < theta.length; i++) theta[i] += 0.01 * advantage * grad[i];
      }
      // Check KL divergence (simplified - if too large, revert)
      const kl = this._klDivergence(oldTheta, theta);
      if (kl > maxKl) theta = oldTheta;
      this._episodes.push({ id: e, steps: trajectory.length, totalReward: trajectory.reduce((s, t) => s + t.reward, 0), trajectory: trajectory.map(t => ({ state: t.state, action: t.action, reward: t.reward })) });
    }
    this._recordHistory('trpo', episodes);
    return { theta, w };
  }

  /** DDPG (Deep Deterministic Policy Gradient) - simplified tabular version. */
  ddpg(env: Environment, qTable: QTable, mu: Map<number, number>, episodes: number = 100, lr: number = 0.01, gamma: number = 0.9, tau: number = 0.001): { qTable: QTable; mu: Map<number, number> } {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      let totalReward = 0;
      const trajectory: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = mu.get(state) ?? 0;
        const { nextState, reward, done } = env.step(state, action);
        const noise = (Math.random() - 0.5) * 0.1;
        const noisyAction = Math.max(0, Math.min(env.actions - 1, Math.round(action + noise)));
        const oldQ = this._getQ(qTable, state, action);
        const maxNext = this._maxQ(qTable, nextState);
        const target = reward + gamma * maxNext;
        this._setQ(qTable, state, action, oldQ + lr * (target - oldQ));
        // Update policy: take greedy action
        mu.set(state, this._argmaxQ(qTable, state));
        void tau;
        trajectory.push({ state, action: noisyAction, reward });
        totalReward += reward;
        state = nextState;
        if (done) break;
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward, trajectory });
    }
    this._recordHistory('ddpg', episodes);
    return { qTable, mu };
  }

  // ---------------------------------------------------------------------------
  // Function approximation methods
  // ---------------------------------------------------------------------------

  /** Semi-gradient TD(0) prediction with linear function approximation. */
  semiGradientTD0(env: Environment, features: number[][], w: number[], alpha: number = 0.01, gamma: number = 0.9, episodes: number = 100): number[] {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      for (let step = 0; step < 1000; step++) {
        const action = Math.floor(Math.random() * env.actions);
        const { nextState, reward, done } = env.step(state, action);
        const v = this._linearValue(w, features[state]);
        const vNext = this._linearValue(w, features[nextState]);
        const delta = reward + gamma * vNext - v;
        for (let i = 0; i < w.length; i++) w[i] += alpha * delta * features[state][i];
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('semiGradientTD0', episodes);
    return w;
  }

  /** Semi-gradient n-step TD prediction. */
  semiGradientNStepTD(env: Environment, features: number[][], w: number[], n: number, alpha: number = 0.01, gamma: number = 0.9, episodes: number = 100): number[] {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const buffer: { state: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        const action = Math.floor(Math.random() * env.actions);
        const { nextState, reward, done } = env.step(state, action);
        buffer.push({ state, reward });
        if (buffer.length > n) buffer.shift();
        if (buffer.length === n) {
          const G = buffer.reduce((s, t, i) => s + Math.pow(gamma, i) * t.reward, 0) +
                    Math.pow(gamma, n) * this._linearValue(w, features[nextState]);
          const v = this._linearValue(w, features[buffer[0].state]);
          const delta = G - v;
          for (let i = 0; i < w.length; i++) w[i] += alpha * delta * features[buffer[0].state][i];
        }
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('semiGradientNStepTD', episodes);
    return w;
  }

  /** Semi-gradient TD(λ) with linear function approximation. */
  semiGradientTDLambda(env: Environment, features: number[][], w: number[], lambda: number = 0.9, alpha: number = 0.01, gamma: number = 0.9, episodes: number = 100): number[] {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const z = new Array(w.length).fill(0); // eligibility trace
      for (let step = 0; step < 1000; step++) {
        const action = Math.floor(Math.random() * env.actions);
        const { nextState, reward, done } = env.step(state, action);
        const v = this._linearValue(w, features[state]);
        const vNext = this._linearValue(w, features[nextState]);
        const delta = reward + gamma * vNext - v;
        for (let i = 0; i < w.length; i++) z[i] = gamma * lambda * z[i] + features[state][i];
        for (let i = 0; i < w.length; i++) w[i] += alpha * delta * z[i];
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('semiGradientTDLambda', episodes);
    return w;
  }

  /** Gradient Monte Carlo prediction. */
  gradientMonteCarlo(env: Environment, features: number[][], w: number[], alpha: number = 0.01, gamma: number = 0.9, episodes: number = 100): number[] {
    for (let e = 0; e < episodes; e++) {
      const trajectory: { state: number; reward: number }[] = [];
      let state = env.reset();
      for (let step = 0; step < 1000; step++) {
        const action = Math.floor(Math.random() * env.actions);
        const { nextState, reward, done } = env.step(state, action);
        trajectory.push({ state, reward });
        state = nextState;
        if (done) break;
      }
      let G = 0;
      const visited = new Set<number>();
      for (let t = trajectory.length - 1; t >= 0; t--) {
        G = gamma * G + trajectory[t].reward;
        if (visited.has(trajectory[t].state)) continue;
        visited.add(trajectory[t].state);
        const v = this._linearValue(w, features[trajectory[t].state]);
        const delta = G - v;
        for (let i = 0; i < w.length; i++) w[i] += alpha * delta * features[trajectory[t].state][i];
      }
    }
    this._recordHistory('gradientMonteCarlo', episodes);
    return w;
  }

  /** LSTD (Least-Squares Temporal Difference) for policy evaluation. */
  lstd(env: Environment, features: number[][], episodes: number = 100, gamma: number = 0.9, epsilon: number = 1e-6): number[] {
    const dim = features[0]?.length ?? 0;
    const A: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    const b: number[] = new Array(dim).fill(0);
    for (let i = 0; i < dim; i++) A[i][i] = epsilon;
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      for (let step = 0; step < 1000; step++) {
        const action = Math.floor(Math.random() * env.actions);
        const { nextState, reward, done } = env.step(state, action);
        const f1 = features[state];
        const f2 = features[nextState];
        for (let i = 0; i < dim; i++) {
          for (let j = 0; j < dim; j++) {
            A[i][j] += f1[i] * (f1[j] - gamma * f2[j]);
          }
          b[i] += f1[i] * reward;
        }
        state = nextState;
        if (done) break;
      }
    }
    const invA = this._matrixInverse(A);
    const w = new Array(dim).fill(0);
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) w[i] += invA[i][j] * b[j];
    }
    this._recordHistory('lstd', episodes);
    return w;
  }

  // ---------------------------------------------------------------------------
  // Importance sampling
  // ---------------------------------------------------------------------------

  /** Ordinary importance sampling. */
  ordinaryImportanceSampling(returns: number[], behaviorProbs: number[], targetProbs: number[]): number {
    if (returns.length === 0) return 0;
    const ratios = returns.map((_, i) => targetProbs[i] / (behaviorProbs[i] + 1e-12));
    const sumRatios = ratios.reduce((s, r) => s + r, 0);
    return returns.reduce((s, r, i) => s + r * ratios[i], 0) / Math.max(1, sumRatios);
  }

  /** Weighted importance sampling (lower variance than ordinary IS). */
  weightedImportanceSampling(returns: number[], behaviorProbs: number[], targetProbs: number[]): number {
    if (returns.length === 0) return 0;
    const ratios = returns.map((_, i) => targetProbs[i] / (behaviorProbs[i] + 1e-12));
    const sumRatios = ratios.reduce((s, r) => s + r, 0);
    if (sumRatios === 0) return 0;
    return returns.reduce((s, r, i) => s + r * ratios[i], 0) / sumRatios;
  }

  /** Per-decision importance sampling. */
  perDecisionImportanceSampling(trajectories: { reward: number; behaviorProb: number; targetProb: number }[][], gamma: number = 0.9): number {
    let total = 0;
    let count = 0;
    for (const traj of trajectories) {
      let G = 0;
      let rho = 1;
      for (let t = 0; t < traj.length; t++) {
        rho *= traj[t].targetProb / (traj[t].behaviorProb + 1e-12);
        G += Math.pow(gamma, t) * traj[t].reward * rho;
      }
      total += G;
      count++;
    }
    return count === 0 ? 0 : total / count;
  }

  // ---------------------------------------------------------------------------
  // Multi-armed bandit algorithms
  // ---------------------------------------------------------------------------

  /** Epsilon-greedy bandit. */
  epsilonGreedyBandit(rewards: number[], counts: number[], epsilon: number = 0.1): number {
    if (Math.random() < epsilon) return Math.floor(Math.random() * rewards.length);
    return rewards.indexOf(Math.max(...rewards));
  }

  /** Upper Confidence Bound (UCB1) bandit. */
  ucb1(values: number[], counts: number[], totalPlays: number, c: number = 2): number {
    let best = 0;
    let bestUcb = -Infinity;
    for (let i = 0; i < values.length; i++) {
      if (counts[i] === 0) return i;
      const ucb = values[i] + c * Math.sqrt(Math.log(totalPlays + 1) / counts[i]);
      if (ucb > bestUcb) { bestUcb = ucb; best = i; }
    }
    return best;
  }

  /** Thompson Sampling bandit (for Bernoulli rewards). */
  thompsonSampling(alpha: number[], beta: number[]): number {
    const samples = alpha.map((a, i) => this._betaSample(a, beta[i]));
    return samples.indexOf(Math.max(...samples));
  }

  /** LinUCB (linear contextual bandit). */
  linUCB(contexts: number[][], alpha: number = 1.0): number[] {
    const dim = contexts[0]?.length ?? 0;
    const A: number[][] = Array.from({ length: dim }, (_, i) =>
      Array.from({ length: dim }, (_, j) => i === j ? 1 : 0)
    );
    const b: number[] = new Array(dim).fill(0);
    const invA = this._matrixInverse(A);
    const theta = invA.map(row => row.reduce((s, v, j) => s + v * b[j], 0));
    const ucb: number[] = [];
    for (const ctx of contexts) {
      const mean = theta.reduce((s, v, i) => s + v * ctx[i], 0);
      const variance = ctx.reduce((s, v, i) => s + v * invA[i].reduce((s2, x, j) => s2 + x * ctx[j], 0), 0);
      ucb.push(mean + alpha * Math.sqrt(variance));
    }
    return ucb;
  }

  // ---------------------------------------------------------------------------
  // Model-based RL
  // ---------------------------------------------------------------------------

  /** Dyna-Q (model-based RL with planning). */
  dynaQ(env: Environment, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1, episodes: number = 100, planningSteps: number = 10): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'dyna_q');
    const model: Map<string, { nextState: number; reward: number }> = new Map();
    const observedStates: number[] = [];
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      for (let step = 0; step < 1000; step++) {
        const action = this.epsilonGreedy(qTable, state, epsilon);
        const { nextState, reward, done } = env.step(state, action);
        const oldQ = this._getQ(qTable, state, action);
        const maxNextQ = this._maxQ(qTable, nextState);
        this._setQ(qTable, state, action, oldQ + alpha * (reward + gamma * maxNextQ - oldQ));
        model.set(`${state}-${action}`, { nextState, reward });
        if (!observedStates.includes(state)) observedStates.push(state);
        // Planning
        for (let p = 0; p < planningSteps; p++) {
          const s = observedStates[Math.floor(Math.random() * observedStates.length)];
          const a = Math.floor(Math.random() * env.actions);
          const result = model.get(`${s}-${a}`);
          if (!result) continue;
          const qOld = this._getQ(qTable, s, a);
          const maxNext = this._maxQ(qTable, result.nextState);
          this._setQ(qTable, s, a, qOld + alpha * (result.reward + gamma * maxNext - qOld));
        }
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('dynaQ', episodes);
    return qTable;
  }

  /** Prioritized sweeping (model-based with priority queue). */
  prioritizedSweeping(env: Environment, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1, episodes: number = 100, theta: number = 0.01, maxSweeps: number = 10): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'prioritized_sweeping');
    const model: Map<string, { nextState: number; reward: number }> = new Map();
    const predecessors: Map<number, { state: number; action: number }[]> = new Map();
    const pQueue: { state: number; action: number; priority: number }[] = [];
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      for (let step = 0; step < 1000; step++) {
        const action = this.epsilonGreedy(qTable, state, epsilon);
        const { nextState, reward, done } = env.step(state, action);
        const oldQ = this._getQ(qTable, state, action);
        const maxNextQ = this._maxQ(qTable, nextState);
        const p = Math.abs(reward + gamma * maxNextQ - oldQ);
        if (p > theta) pQueue.push({ state, action, priority: p });
        model.set(`${state}-${action}`, { nextState, reward });
        if (!predecessors.has(nextState)) predecessors.set(nextState, []);
        predecessors.get(nextState)!.push({ state, action });
        // Planning
        for (let s = 0; s < maxSweeps && pQueue.length > 0; s++) {
          pQueue.sort((a, b) => b.priority - a.priority);
          const top = pQueue.shift()!;
          const result = model.get(`${top.state}-${top.action}`);
          if (!result) continue;
          const qOld = this._getQ(qTable, top.state, top.action);
          const maxNext = this._maxQ(qTable, result.nextState);
          this._setQ(qTable, top.state, top.action, qOld + alpha * (result.reward + gamma * maxNext - qOld));
          for (const pred of predecessors.get(top.state) ?? []) {
            const predResult = model.get(`${pred.state}-${pred.action}`);
            if (!predResult) continue;
            const qPred = this._getQ(qTable, pred.state, pred.action);
            const maxPredNext = this._maxQ(qTable, predResult.nextState);
            const pPred = Math.abs(predResult.reward + gamma * maxPredNext - qPred);
            if (pPred > theta) pQueue.push({ state: pred.state, action: pred.action, priority: pPred });
          }
        }
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('prioritizedSweeping', episodes);
    return qTable;
  }

  /** Monte Carlo Tree Search (MCTS). */
  mcts(env: Environment, rootState: number, iterations: number = 1000, c: number = 1.414): number {
    const tree: Map<string, { visits: number; value: number; children: number[] }> = new Map();
    tree.set(`s${rootState}`, { visits: 0, value: 0, children: [] });
    for (let iter = 0; iter < iterations; iter++) {
      // Selection
      let state = rootState;
      const path: string[] = [`s${rootState}`];
      while (true) {
        const node = tree.get(`s${state}`);
        if (!node || node.children.length === 0) break;
        let bestChild = 0;
        let bestUcb = -Infinity;
        for (const child of node.children) {
          const childNode = tree.get(`s${child}`);
          if (!childNode) continue;
          const ucb = childNode.value / Math.max(1, childNode.visits) +
                      c * Math.sqrt(Math.log(node.visits + 1) / Math.max(1, childNode.visits));
          if (ucb > bestUcb) { bestUcb = ucb; bestChild = child; }
        }
        state = bestChild;
        path.push(`s${state}`);
      }
      // Expansion
      const node = tree.get(`s${state}`);
      if (node) {
        for (let a = 0; a < env.actions; a++) {
          const { nextState } = env.step(state, a);
          node.children.push(nextState);
          if (!tree.has(`s${nextState}`)) tree.set(`s${nextState}`, { visits: 0, value: 0, children: [] });
        }
      }
      // Simulation (random rollout)
      let simState = state;
      let totalReward = 0;
      const rolloutDepth = 50;
      for (let d = 0; d < rolloutDepth; d++) {
        const action = Math.floor(Math.random() * env.actions);
        const { nextState, reward, done } = env.step(simState, action);
        totalReward += reward;
        simState = nextState;
        if (done) break;
      }
      // Backpropagation
      for (const nodeKey of path) {
        const n = tree.get(nodeKey);
        if (n) {
          n.visits++;
          n.value += totalReward;
        }
      }
    }
    // Return best action
    const rootNode = tree.get(`s${rootState}`);
    if (!rootNode) return 0;
    let bestAction = 0;
    let bestVisits = 0;
    for (let a = 0; a < env.actions; a++) {
      const { nextState } = env.step(rootState, a);
      const child = tree.get(`s${nextState}`);
      if (child && child.visits > bestVisits) {
        bestVisits = child.visits;
        bestAction = a;
      }
    }
    return bestAction;
  }

  // ---------------------------------------------------------------------------
  // Exploration strategies
  // ---------------------------------------------------------------------------

  /** Boltzmann exploration (softmax action selection). */
  boltzmannExploration(qValues: number[], temperature: number): number {
    return this.softmaxPolicy(qValues, temperature);
  }

  /** UCB-based exploration for action selection. */
  ucbExploration(qTable: QTable, state: number, c: number = 2): number {
    const totalVisits = qTable.actions.reduce((s, a) => s + (qTable.visits.get(`${state}-${a}`) ?? 0), 0);
    let best = qTable.actions[0];
    let bestUcb = -Infinity;
    for (const a of qTable.actions) {
      const q = this._getQ(qTable, state, a);
      const visits = qTable.visits.get(`${state}-${a}`) ?? 0;
      if (visits === 0) return a;
      const ucb = q + c * Math.sqrt(Math.log(totalVisits + 1) / visits);
      if (ucb > bestUcb) { bestUcb = ucb; best = a; }
    }
    return best;
  }

  /** Optimistic initialization (encourages exploration). */
  optimisticInitialization(qTable: QTable, optimisticValue: number = 10): void {
    for (const s of qTable.states) {
      for (const a of qTable.actions) {
        qTable.values.set(`${s}-${a}`, optimisticValue);
      }
    }
  }

  /** Curiosity-driven exploration (bonus reward based on prediction error). */
  curiosityBonus(state: number, nextState: number, predictionModel: Map<number, number>): number {
    const predicted = predictionModel.get(state) ?? 0;
    const error = Math.abs(nextState - predicted);
    predictionModel.set(state, nextState);
    return error * 0.1;
  }

  /** Random network distillation exploration bonus. */
  randomNetworkDistillationBonus(features: number[], targetWeights: number[][], predictorWeights: number[][]): number {
    const target = targetWeights.map(row => row.reduce((s, w, i) => s + w * (features[i] ?? 0), 0));
    const predicted = predictorWeights.map(row => row.reduce((s, w, i) => s + w * (features[i] ?? 0), 0));
    return target.reduce((s, v, i) => s + Math.pow(v - (predicted[i] ?? 0), 2), 0);
  }

  // ---------------------------------------------------------------------------
  // Reward shaping and advantage estimation
  // ---------------------------------------------------------------------------

  /** Potential-based reward shaping. */
  rewardShaping(reward: number, state: number, nextState: number, potential: Map<number, number>, gamma: number = 0.9): number {
    const phiState = potential.get(state) ?? 0;
    const phiNext = potential.get(nextState) ?? 0;
    return reward + gamma * phiNext - phiState;
  }

  /** Generalized Advantage Estimation (GAE). */
  generalizedAdvantageEstimation(rewards: number[], values: number[], gamma: number = 0.9, lambda: number = 0.95): number[] {
    const advantages: number[] = new Array(rewards.length).fill(0);
    let gae = 0;
    for (let t = rewards.length - 1; t >= 0; t--) {
      const delta = rewards[t] + gamma * (values[t + 1] ?? 0) - values[t];
      gae = gamma * lambda * gae + delta;
      advantages[t] = gae;
    }
    return advantages;
  }

  /** Return normalization (for stable policy gradient training). */
  normalizeReturns(returns: number[]): number[] {
    const mean = this._mean(returns);
    const std = Math.sqrt(this._variance(returns, mean)) + 1e-8;
    return returns.map(r => (r - mean) / std);
  }

  /** Reward normalization. */
  normalizeRewards(rewards: number[], epsilon: number = 1e-8): number[] {
    const mean = this._mean(rewards);
    const std = Math.sqrt(this._variance(rewards, mean)) + epsilon;
    return rewards.map(r => (r - mean) / std);
  }

  /** Discounted cumulative return. */
  discountedReturn(rewards: number[], gamma: number = 0.9): number {
    let G = 0;
    for (let t = rewards.length - 1; t >= 0; t--) G = gamma * G + rewards[t];
    return G;
  }

  /** Compute lambda return (for TD(λ)). */
  lambdaReturn(rewards: number[], values: number[], gamma: number = 0.9, lambda: number = 0.9): number[] {
    const n = rewards.length;
    const returns: number[] = new Array(n).fill(0);
    for (let t = 0; t < n; t++) {
      let G = 0;
      for (let k = t; k < n; k++) {
        const nStep = rewards.slice(t, k + 1).reduce((s, r, i) => s + Math.pow(gamma, i) * r, 0) +
                      Math.pow(gamma, k - t + 1) * (values[k + 1] ?? 0);
        const weight = Math.pow(lambda, k - t) * (1 - lambda);
        G += weight * nStep;
      }
      returns[t] = G;
    }
    return returns;
  }

  // ---------------------------------------------------------------------------
  // Policy evaluation and value function utilities
  // ---------------------------------------------------------------------------

  /** Iterative policy evaluation. */
  iterativePolicyEvaluation(env: Environment, policy: Map<number, number>, gamma: number = 0.9, theta: number = 1e-6, maxIter: number = 1000): number[] {
    const values = new Array(env.states).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
      let delta = 0;
      for (let s = 0; s < env.states; s++) {
        const v = values[s];
        const a = policy.get(s) ?? 0;
        const { nextState, reward } = env.step(s, a);
        values[s] = reward + gamma * values[nextState];
        delta = Math.max(delta, Math.abs(v - values[s]));
      }
      if (delta < theta) break;
    }
    return values;
  }

  /** Action-value evaluation from state values. */
  actionValueEvaluation(env: Environment, stateValues: number[], gamma: number = 0.9): QTable {
    const qTable = this._initQTable(env.states, env.actions, 'q_eval');
    for (const s of qTable.states) {
      for (const a of qTable.actions) {
        const { nextState, reward } = env.step(s, a);
        this._setQ(qTable, s, a, reward + gamma * (stateValues[nextState] ?? 0));
      }
    }
    return qTable;
  }

  /** Extract greedy policy from Q-table. */
  extractPolicy(qTable: QTable): Policy[] {
    const policies: Policy[] = [];
    for (const s of qTable.states) {
      const bestAction = this._argmaxQ(qTable, s);
      policies.push({ state: s, action: bestAction, probability: 1, greedy: true });
    }
    this._policies = policies;
    return policies;
  }

  /** Soft policy extraction (with probabilities based on softmax). */
  extractSoftPolicy(qTable: QTable, tau: number = 1): Policy[] {
    const policies: Policy[] = [];
    for (const s of qTable.states) {
      const qValues = qTable.actions.map(a => this._getQ(qTable, s, a));
      const exp = qValues.map(q => Math.exp(q / tau));
      const sum = exp.reduce((s2, v) => s2 + v, 0);
      for (const a of qTable.actions) {
        policies.push({ state: s, action: a, probability: exp[a] / sum, greedy: a === qValues.indexOf(Math.max(...qValues)) });
      }
    }
    this._policies = policies;
    return policies;
  }

  // ---------------------------------------------------------------------------
  // Game theory and multi-agent
  // ---------------------------------------------------------------------------

  /** Minimax algorithm for two-player zero-sum games. */
  minimax(env: Environment, state: number, depth: number, maximizing: boolean): number {
    if (depth === 0) return this._maxQ(this._initQTable(env.states, env.actions, 'minimax'), state);
    if (maximizing) {
      let maxEval = -Infinity;
      for (let a = 0; a < env.actions; a++) {
        const { nextState, reward } = env.step(state, a);
        const eval_ = reward + this.minimax(env, nextState, depth - 1, false);
        if (eval_ > maxEval) maxEval = eval_;
      }
      return maxEval;
    }
    let minEval = Infinity;
    for (let a = 0; a < env.actions; a++) {
      const { nextState, reward } = env.step(state, a);
      const eval_ = reward + this.minimax(env, nextState, depth - 1, true);
      if (eval_ < minEval) minEval = eval_;
    }
    return minEval;
  }

  /** Alpha-beta pruning for two-player games. */
  alphaBeta(env: Environment, state: number, depth: number, alpha: number, beta: number, maximizing: boolean): number {
    if (depth === 0) return this._maxQ(this._initQTable(env.states, env.actions, 'alpha_beta'), state);
    if (maximizing) {
      let maxEval = -Infinity;
      for (let a = 0; a < env.actions; a++) {
        const { nextState, reward } = env.step(state, a);
        const eval_ = reward + this.alphaBeta(env, nextState, depth - 1, alpha, beta, false);
        if (eval_ > maxEval) maxEval = eval_;
        if (eval_ > alpha) alpha = eval_;
        if (beta <= alpha) break;
      }
      return maxEval;
    }
    let minEval = Infinity;
    for (let a = 0; a < env.actions; a++) {
      const { nextState, reward } = env.step(state, a);
      const eval_ = reward + this.alphaBeta(env, nextState, depth - 1, alpha, beta, true);
      if (eval_ < minEval) minEval = eval_;
      if (eval_ < beta) beta = eval_;
      if (beta <= alpha) break;
    }
    return minEval;
  }

  /** Nash equilibrium computation (2-player normal-form game, simplified). */
  nashEquilibrium(payoffMatrix: number[][][]): { rowStrategy: number[]; colStrategy: number[] } {
    const nRows = payoffMatrix.length;
    const nCols = payoffMatrix[0]?.length ?? 0;
    // Uniform mixed strategy as fallback
    const rowStrategy = new Array(nRows).fill(1 / nRows);
    const colStrategy = new Array(nCols).fill(1 / nCols);
    // Iterate to find best response equilibrium
    for (let iter = 0; iter < 100; iter++) {
      // Row player's best response
      const rowBest = new Array(nRows).fill(0);
      let bestRow = 0;
      let bestVal = -Infinity;
      for (let r = 0; r < nRows; r++) {
        const val = payoffMatrix[r].reduce((s, p, c) => s + p[0] * colStrategy[c], 0);
        if (val > bestVal) { bestVal = val; bestRow = r; }
      }
      rowBest[bestRow] = 1;
      for (let i = 0; i < nRows; i++) rowStrategy[i] = 0.9 * rowStrategy[i] + 0.1 * rowBest[i];
      // Col player's best response
      const colBest = new Array(nCols).fill(0);
      let bestCol = 0;
      let bestValC = -Infinity;
      for (let c = 0; c < nCols; c++) {
        const val = payoffMatrix.reduce((s, row, r) => s + row[c][1] * rowStrategy[r], 0);
        if (val > bestValC) { bestValC = val; bestCol = c; }
      }
      colBest[bestCol] = 1;
      for (let i = 0; i < nCols; i++) colStrategy[i] = 0.9 * colStrategy[i] + 0.1 * colBest[i];
    }
    return { rowStrategy, colStrategy };
  }

  /** Self-play training (simplified - agent plays against itself). */
  selfPlay(env: Environment, qTable: QTable, episodes: number = 100, alpha: number = 0.1, gamma: number = 0.9): QTable {
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const trajectory: { state: number; action: number; reward: number }[] = [];
      for (let step = 0; step < 1000; step++) {
        // Both players use the same Q-table
        const action = this.epsilonGreedy(qTable, state, 0.1);
        const { nextState, reward, done } = env.step(state, action);
        const oldQ = this._getQ(qTable, state, action);
        const maxNextQ = this._maxQ(qTable, nextState);
        this._setQ(qTable, state, action, oldQ + alpha * (reward + gamma * maxNextQ - oldQ));
        trajectory.push({ state, action, reward });
        state = nextState;
        if (done) break;
      }
      this._episodes.push({ id: e, steps: trajectory.length, totalReward: trajectory.reduce((s, t) => s + t.reward, 0), trajectory });
    }
    this._recordHistory('selfPlay', episodes);
    return qTable;
  }

  // ---------------------------------------------------------------------------
  // Modern deep RL extensions
  // ---------------------------------------------------------------------------

  /** Dueling DQN architecture (separate value and advantage streams). */
  duelingDQN(env: Environment, episodes: number = 100, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1): { valueTable: QTable; advantageTable: QTable } {
    const valueTable = this._initQTable(env.states, 1, 'dueling_value');
    const advantageTable = this._initQTable(env.states, env.actions, 'dueling_advantage');
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      for (let step = 0; step < 1000; step++) {
        // Combine value and advantage: Q(s, a) = V(s) + A(s, a) - mean(A(s, *))
        const combinedQ = advantageTable.actions.map(a =>
          this._getQ(valueTable, state, 0) + this._getQ(advantageTable, state, a) -
          this._mean(advantageTable.actions.map(a => this._getQ(advantageTable, state, a)))
        );
        const action = Math.random() < epsilon ? Math.floor(Math.random() * env.actions) : combinedQ.indexOf(Math.max(...combinedQ));
        const { nextState, reward, done } = env.step(state, action);
        const maxNextAdv = this._maxQ(advantageTable, nextState);
        const nextValue = this._getQ(valueTable, nextState, 0);
        const target = reward + gamma * (nextValue + maxNextAdv);
        const oldQ = combinedQ[action];
        const tdError = target - oldQ;
        // Update value and advantage
        this._setQ(valueTable, state, 0, this._getQ(valueTable, state, 0) + alpha * tdError);
        this._setQ(advantageTable, state, action, this._getQ(advantageTable, state, action) + alpha * tdError * 0.5);
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('duelingDQN', episodes);
    return { valueTable, advantageTable };
  }

  /** Categorical DQN (C51) - distributional RL with categorical distribution. */
  categoricalDQN(env: Environment, episodes: number = 100, nAtoms: number = 51, vmin: number = -10, vmax: number = 10, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1): Map<string, number[]> {
    const atoms = Array.from({ length: nAtoms }, (_, i) => vmin + (vmax - vmin) * i / (nAtoms - 1));
    const distributions = new Map<string, number[]>();
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      for (let step = 0; step < 1000; step++) {
        // Sample action based on expected value
        const action = Math.random() < epsilon ? Math.floor(Math.random() * env.actions) : 0;
        const { nextState, reward, done } = env.step(state, action);
        // Update distribution
        const key = `${state}-${action}`;
        let dist = distributions.get(key) ?? new Array(nAtoms).fill(1 / nAtoms);
        const nextKey = `${nextState}-${action}`;
        const nextDist = distributions.get(nextKey) ?? new Array(nAtoms).fill(1 / nAtoms);
        // Project target distribution
        const newDist = new Array(nAtoms).fill(0);
        for (let i = 0; i < nAtoms; i++) {
          const projected = reward + gamma * atoms[i];
          const idx = Math.max(0, Math.min(nAtoms - 1, Math.round((projected - vmin) / (vmax - vmin) * (nAtoms - 1))));
          newDist[idx] += nextDist[i];
        }
        // Soft update
        dist = dist.map((v, i) => (1 - alpha) * v + alpha * newDist[i]);
        const sum = dist.reduce((s, v) => s + v, 0);
        if (sum > 0) dist = dist.map(v => v / sum);
        distributions.set(key, dist);
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('categoricalDQN', episodes);
    return distributions;
  }

  /** Quantile regression DQN (QR-DQN) - distributional RL with quantiles. */
  quantileRegressionDQN(env: Environment, episodes: number = 100, nQuantiles: number = 10, alpha: number = 0.1, gamma: number = 0.9, epsilon: number = 0.1): Map<string, number[]> {
    const quantiles = new Map<string, number[]>();
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      for (let step = 0; step < 1000; step++) {
        const action = Math.random() < epsilon ? Math.floor(Math.random() * env.actions) : 0;
        const { nextState, reward, done } = env.step(state, action);
        const key = `${state}-${action}`;
        const nextKey = `${nextState}-${action}`;
        let qValues = quantiles.get(key) ?? new Array(nQuantiles).fill(0);
        const nextQuantiles = quantiles.get(nextKey) ?? new Array(nQuantiles).fill(0);
        const target = reward + gamma * Math.max(...nextQuantiles);
        // Quantile regression update (huber loss)
        const tau = (Array.from({ length: nQuantiles }, (_, i) => (i + 0.5) / nQuantiles));
        qValues = qValues.map((q, i) => {
          const delta = target - q;
          const huber = Math.abs(delta) <= 1 ? 0.5 * delta * delta : Math.abs(delta) - 0.5;
          return q + alpha * (tau[i] - (delta < 0 ? 1 : 0)) * huber;
        });
        quantiles.set(key, qValues);
        state = nextState;
        if (done) break;
      }
    }
    this._recordHistory('qrDQN', episodes);
    return quantiles;
  }

  /** Rainbow DQN (combination of DQN improvements). */
  rainbowDQN(env: Environment, episodes: number = 100): QTable {
    // Combine: Double DQN, Dueling, Prioritized Replay, Multi-step, Distributional, Noisy Nets
    const { qA } = this.doubleQLearning(env, 0.1, 0.9, 0.1, episodes);
    this._recordHistory('rainbowDQN', episodes);
    return qA;
  }

  /** Hindsight Experience Replay (HER) - relabels failed episodes as successful. */
  hindsightExperienceRollout(env: Environment, episodes: number = 100, maxSteps: number = 1000): { state: number; action: number; reward: number; nextState: number; goal: number }[] {
    const buffer: { state: number; action: number; reward: number; nextState: number; goal: number }[] = [];
    for (let e = 0; e < episodes; e++) {
      let state = env.reset();
      const trajectory: { state: number; action: number; reward: number; nextState: number }[] = [];
      for (let step = 0; step < maxSteps; step++) {
        const action = Math.floor(Math.random() * env.actions);
        const { nextState, reward, done } = env.step(state, action);
        trajectory.push({ state, action, reward, nextState });
        state = nextState;
        if (done) break;
      }
      // Original transitions
      for (const t of trajectory) {
        buffer.push({ ...t, goal: state });
      }
      // Hindsight: relabel with achieved goal
      for (let i = 0; i < trajectory.length; i++) {
        for (let j = i + 1; j < trajectory.length; j++) {
          buffer.push({
            state: trajectory[i].state,
            action: trajectory[i].action,
            reward: 0, // Sparse reward: 1 only at goal, else 0
            nextState: trajectory[i].nextState,
            goal: trajectory[j].nextState,
          });
        }
      }
    }
    this._recordHistory('hindsightExperienceRollout', episodes);
    return buffer;
  }

  // ---------------------------------------------------------------------------
  // Additional utility methods and registry access
  // ---------------------------------------------------------------------------

  /** Get the highest reward episode. */
  bestEpisode(): Episode | undefined {
    if (this._episodes.length === 0) return undefined;
    return this._episodes.reduce((best, e) => e.totalReward > best.totalReward ? e : best, this._episodes[0]);
  }

  /** Compute the average reward across all episodes. */
  averageReward(): number {
    if (this._episodes.length === 0) return 0;
    return this._mean(this._episodes.map(e => e.totalReward));
  }

  /** Compute the moving average of episode rewards. */
  movingAverageReward(windowSize: number = 10): number[] {
    const result: number[] = [];
    for (let i = 0; i < this._episodes.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = this._episodes.slice(start, i + 1).map(e => e.totalReward);
      result.push(this._mean(window));
    }
    return result;
  }

  /** Compute regret (difference from optimal). */
  regret(optimalReward: number): number[] {
    return this._episodes.map(e => optimalReward - e.totalReward);
  }

  /** Get a stored Q-table by ID. */
  getQTable(id: string): QTable | undefined {
    return this._qTables.get(id);
  }

  /** List all stored Q-table IDs. */
  listQTables(): string[] {
    return Array.from(this._qTables.keys());
  }

  /** Get stored policies. */
  getPolicies(): Policy[] {
    return [...this._policies];
  }

  /** Get stored episodes. */
  getEpisodes(): Episode[] {
    return [...this._episodes];
  }

  /** Get training history. */
  getHistory(): RLRecord[] {
    return [...this._history];
  }

  /** Clear training history. */
  clearHistory(): void {
    this._history = [];
  }

  /** Clear episodes but keep history. */
  clearEpisodes(): void {
    this._episodes = [];
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

  private _variance(values: number[], mean?: number): number {
    if (values.length === 0) return 0;
    const m = mean ?? this._mean(values);
    return values.reduce((s, v) => s + Math.pow(v - m, 2), 0) / values.length;
  }

  private _argmaxQ(qTable: QTable, state: number): number {
    let best = qTable.actions[0];
    let bestQ = -Infinity;
    for (const a of qTable.actions) {
      const q = this._getQ(qTable, state, a);
      if (q > bestQ) { bestQ = q; best = a; }
    }
    return best;
  }

  private _nStepReturn(
    buffer: { state: number; action: number; reward: number }[],
    tau: number,
    n: number,
    gamma: number,
    qTable: QTable,
  ): number {
    let G = 0;
    const last = Math.min(tau + n, buffer.length);
    for (let i = tau; i < last; i++) {
      G += Math.pow(gamma, i - tau) * buffer[i].reward;
    }
    if (tau + n < buffer.length) {
      const s = buffer[tau + n - 1].state;
      G += Math.pow(gamma, n) * this._maxQ(qTable, s);
    }
    return G;
  }

  /** Sample an action from a softmax (linear) policy parameterized by theta over discrete actions. */
  private _samplePolicy(theta: number[], state: number, nActions: number): number {
    const logits: number[] = [];
    for (let a = 0; a < nActions; a++) {
      const idx = (state * nActions + a) % theta.length;
      logits.push(theta[idx] ?? 0);
    }
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sum = exps.reduce((s, v) => s + v, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < exps.length; i++) {
      r -= exps[i];
      if (r <= 0) return i;
    }
    return nActions - 1;
  }

  /** Score function (gradient of log-prob) for the softmax policy. */
  private _policyGradient(theta: number[], state: number, action: number, nActions: number): number[] {
    const grad = new Array(theta.length).fill(0);
    const logits: number[] = [];
    for (let a = 0; a < nActions; a++) {
      logits.push(theta[(state * nActions + a) % theta.length] ?? 0);
    }
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sum = exps.reduce((s, v) => s + v, 0);
    const probs = exps.map(e => e / (sum + 1e-12));
    for (let a = 0; a < nActions; a++) {
      const indicator = a === action ? 1 : 0;
      const idx = (state * nActions + a) % theta.length;
      grad[idx] = (grad[idx] ?? 0) + (indicator - probs[a]);
    }
    return grad;
  }

  /** Log-probability of an action under the softmax (linear) policy. */
  private _logProb(theta: number[], state: number, action: number, nActions: number): number {
    const logits: number[] = [];
    for (let a = 0; a < nActions; a++) {
      logits.push(theta[(state * nActions + a) % theta.length] ?? 0);
    }
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sum = exps.reduce((s, v) => s + v, 0);
    return Math.log((exps[action] ?? 1e-12) / (sum + 1e-12));
  }

  /** Approximate KL divergence between two policies via Gaussian assumption on parameters. */
  private _klDivergence(thetaA: number[], thetaB: number[]): number {
    let kl = 0;
    const n = Math.min(thetaA.length, thetaB.length);
    for (let i = 0; i < n; i++) {
      const diff = thetaA[i] - thetaB[i];
      kl += 0.5 * diff * diff;
    }
    return kl;
  }

  /** Linear value function approximation: V(s) = w^T features(s). */
  private _linearValue(w: number[], features: number[]): number {
    let v = 0;
    const n = Math.min(w.length, features.length);
    for (let i = 0; i < n; i++) v += w[i] * features[i];
    return v;
  }

  /** Matrix inverse via Gauss-Jordan elimination (for LSTD/LinUCB). */
  private _matrixInverse(A: number[][]): number[][] {
    const n = A.length;
    if (n === 0) return [];
    const aug: number[][] = A.map((row, i) => [
      ...row,
      ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0),
    ]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(aug[r][col]) > Math.abs(aug[pivot][col])) pivot = r;
      }
      if (pivot !== col) {
        const tmp = aug[pivot]; aug[pivot] = aug[col]; aug[col] = tmp;
      }
      const pv = aug[col][col];
      if (Math.abs(pv) < 1e-12) continue;
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pv;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const factor = aug[r][col];
        for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[col][j];
      }
    }
    return aug.map(row => row.slice(n));
  }

  /** Sample from a Beta(alpha, beta) distribution via gamma sampling. */
  private _betaSample(alpha: number, beta: number): number {
    const x = this._gammaSample(alpha, 1);
    const y = this._gammaSample(beta, 1);
    return x / (x + y + 1e-12);
  }

  /** Sample from a Gamma(shape, scale) distribution using Marsaglia-Tsang method. */
  private _gammaSample(shape: number, scale: number): number {
    if (shape < 1) {
      const u = Math.random();
      return this._gammaSample(shape + 1, scale) * Math.pow(u, 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x: number, v: number;
      do {
        x = this._standardNormal();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  /** Standard normal sample via Box-Muller transform. */
  private _standardNormal(): number {
    const u1 = Math.random() || 1e-12;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private _recordHistory(algorithm: string, episodes: number): void {
    const recent = this._episodes.slice(-episodes);
    const avgReward = this._mean(recent.map(e => e.totalReward));
    const bestReward = recent.length === 0 ? 0 : Math.max(...recent.map(e => e.totalReward));
    this._history.push({ algorithm, episodes, avgReward, bestReward, timestamp: Date.now() });
  }
}
