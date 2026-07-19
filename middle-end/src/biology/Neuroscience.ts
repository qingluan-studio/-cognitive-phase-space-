import { DataPacket, PacketMeta } from '../shared/types';

/** Neuron descriptor. */
export interface Neuron {
  type: 'sensory' | 'motor' | 'interneuron';
  threshold: number;
}

/** Synapse descriptor. */
export interface Synapse {
  type: 'electrical' | 'chemical';
  strength: number;
}

/** Action potential descriptor. */
export interface ActionPotential {
  threshold: number;
  amplitude: number;
  duration: number;
}

/** Neuroscience: neurons, synapses, potentials. */
export class Neuroscience {
  private _neurons: Neuron[] = [];
  private _synapses: Synapse[] = [];
  private _potentials: ActionPotential[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Resting membrane potential in mV. */
  restingPotential(): number {
    this._history.push({ method: 'restingPotential' });
    return -70;
  }

  /** Generate an action potential given a stimulus. */
  actionPotential(stimulus: number): ActionPotential {
    const threshold = -55;
    const amplitude = stimulus >= threshold ? 100 : 0;
    const potential: ActionPotential = {
      threshold,
      amplitude,
      duration: 1,
    };
    this._potentials.push(potential);
    this._history.push({ method: 'actionPotential', stimulus });
    return potential;
  }

  /** Nernst equation: E_ion = (RT/zF) * ln([out]/[in]). */
  nernstEquation(ion: string, inside: number, outside: number): number {
    const z: Record<string, number> = { K: 1, Na: 1, Cl: -1, Ca: 2 };
    const charge = z[ion] ?? 1;
    const E = (8.314 * 310 / (charge * 96485)) * Math.log(outside / inside) * 1000;
    this._history.push({ method: 'nernstEquation', ion });
    return E;
  }

  /** Goldman-Hodgkin-Katz equation. */
  goldmanEquation(ions: Array<{ name: string; in: number; out: number; permeability: number }>): number {
    let numerator = 0;
    let denominator = 0;
    for (const ion of ions) {
      if (ion.name === 'Cl') {
        numerator += ion.permeability * ion.in;
        denominator += ion.permeability * ion.out;
      } else {
        numerator += ion.permeability * ion.out;
        denominator += ion.permeability * ion.in;
      }
    }
    if (denominator === 0) return 0;
    const Vm = (8.314 * 310 / 96485) * Math.log(numerator / denominator) * 1000;
    this._history.push({ method: 'goldmanEquation' });
    return Vm;
  }

  /** Synaptic transmission. */
  synapticTransmission(neurotransmitter: string, receptor: string): { neurotransmitter: string; receptor: string; effect: string } {
    const effects: Record<string, string> = {
      'glutamate': 'excitatory (EPSP)',
      'GABA': 'inhibitory (IPSP)',
      'acetylcholine': 'excitatory at neuromuscular junction',
      'dopamine': 'modulatory',
      'serotonin': 'modulatory',
      'norepinephrine': 'modulatory',
    };
    const effect = effects[neurotransmitter] ?? 'unknown';
    const synapse: Synapse = { type: 'chemical', strength: 0.5 };
    this._synapses.push(synapse);
    void receptor;
    this._history.push({ method: 'synapticTransmission' });
    return { neurotransmitter, receptor, effect };
  }

  /** Neural coding analysis. */
  neuralCoding(stimulus: number, response: number): { rate: number; efficiency: number } {
    const rate = stimulus === 0 ? 0 : response / stimulus;
    this._history.push({ method: 'neuralCoding' });
    return { rate, efficiency: Math.min(1, rate) };
  }

  /** Refractory period descriptor. */
  refractoryPeriod(type: 'absolute' | 'relative'): { type: string; duration: number } {
    const duration = type === 'absolute' ? 1 : 5;
    this._history.push({ method: 'refractoryPeriod' });
    return { type, duration };
  }

  /** Hebbian learning: 'cells that fire together wire together'. */
  hebbianLearning(pre: number, post: number, strength: number): { newStrength: number; delta: number } {
    const delta = pre * post * 0.01;
    const newStrength = Math.max(0, Math.min(1, strength + delta));
    this._history.push({ method: 'hebbianLearning' });
    return { newStrength, delta };
  }

  /** Long-term potentiation (LTP). */
  ltp(neurons: string[]): { potentiated: string[]; strength: number } {
    this._history.push({ method: 'ltp' });
    return { potentiated: neurons, strength: 0.9 };
  }

  /** Long-term depression (LTD). */
  ltd(neurons: string[]): { depressed: string[]; strength: number } {
    this._history.push({ method: 'ltd' });
    return { depressed: neurons, strength: 0.2 };
  }

  /** Brain wave (EEG) bands. */
  brainWaves(band: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma', frequency: number): { band: string; range: string; state: string } {
    const table: Record<string, { range: string; state: string }> = {
      delta: { range: '0.5-4 Hz', state: 'deep sleep' },
      theta: { range: '4-8 Hz', state: 'drowsiness' },
      alpha: { range: '8-13 Hz', state: 'relaxed' },
      beta: { range: '13-30 Hz', state: 'alert' },
      gamma: { range: '30-100 Hz', state: 'cognitive processing' },
    };
    const entry = table[band];
    this._history.push({ method: 'brainWaves', frequency });
    return { band, range: entry.range, state: entry.state };
  }

  /** Catalog of major neurotransmitters. */
  neurotransmitters(): Array<{ name: string; function: string }> {
    this._history.push({ method: 'neurotransmitters' });
    return [
      { name: 'glutamate', function: 'primary excitatory' },
      { name: 'GABA', function: 'primary inhibitory' },
      { name: 'acetylcholine', function: 'muscle activation, memory' },
      { name: 'dopamine', function: 'reward, motor control' },
      { name: 'serotonin', function: 'mood, sleep' },
      { name: 'norepinephrine', function: 'arousal, attention' },
      { name: 'histamine', function: 'wakefulness' },
    ];
  }

  toPacket(): DataPacket<{
    neurons: Neuron[];
    synapses: Synapse[];
    potentials: ActionPotential[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'Neuroscience'],
      priority: 1,
      phase: 'biology:neuroscience',
    };
    return {
      id: `neuro-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        neurons: this._neurons,
        synapses: this._synapses,
        potentials: this._potentials,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._neurons = [];
    this._synapses = [];
    this._potentials = [];
    this._history = [];
    this._counter = 0;
  }

  get neuronCount(): number {
    return this._neurons.length;
  }

  get synapseCount(): number {
    return this._synapses.length;
  }

  get potentialCount(): number {
    return this._potentials.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
