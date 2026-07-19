import { DataPacket, PacketMeta } from '../shared/types';

/** A behavioral bias descriptor. */
export interface Bias {
  readonly name: string;
  readonly description: string;
  readonly effect: number;
  readonly domain: 'judgment' | 'decision' | 'memory' | 'social';
}

/** A nudge intervention. */
export interface Nudge {
  readonly type: 'default' | 'framing' | 'social-proof' | 'salience' | 'anchor';
  readonly intervention: string;
  readonly target: string;
  readonly expectedEffect: number;
}

/** A preference descriptor. */
export interface Preference {
  readonly type: 'risk-averse' | 'risk-seeking' | 'loss-averse' | 'time-inconsistent';
  readonly reference: number;
  readonly value: number;
  readonly domain: string;
}

/** Prospect theory value function result. */
export interface ProspectValue {
  readonly gains: number;
  readonly losses: number;
  readonly probabilities: number[];
  readonly value: number;
  readonly weighting: number[];
}

/** Choice architecture descriptor. */
export interface ChoiceArchitecture {
  readonly options: string[];
  readonly default: string;
  readonly frame: string;
  readonly complexity: number;
}

/**
 * BehavioralEconomics models cognitive biases, heuristics, nudges, and
 * prospect-theory value functions.
 */
export class BehavioralEconomics {
  private _biases: Map<string, Bias> = new Map();
  private _nudges: Nudge[] = [];
  private _preferences: Preference[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedBiases();
  }

  get biasCount(): number { return this._biases.size; }
  get nudgeCount(): number { return this._nudges.length; }
  get preferenceCount(): number { return this._preferences.length; }

  /** Model anchoring bias effect on estimate. */
  anchoringBias(anchor: number, estimate: number): { biasedEstimate: number; shift: number; ratio: number } {
    const biasedEstimate = estimate * 0.6 + anchor * 0.4;
    const shift = biasedEstimate - estimate;
    return {
      biasedEstimate: Number(biasedEstimate.toFixed(2)),
      shift: Number(shift.toFixed(2)),
      ratio: Number((shift / Math.max(1, estimate)).toFixed(3)),
    };
  }

  /** Model availability heuristic. */
  availabilityHeuristic(examples: string[], judgment: number): { bias: number; salient: boolean; examples: string[] } {
    const bias = examples.length * 0.1;
    return {
      bias: Number(bias.toFixed(2)),
      salient: examples.length > 3,
      examples,
    };
  }

  /** Model representativeness heuristic. */
  representativenessHeuristic(stereotype: string, probability: number): { biasedProbability: number; stereotype: string } {
    const biasedProbability = probability * 0.5 + (stereotype.length > 5 ? 0.3 : 0.1);
    return {
      biasedProbability: Number(Math.min(1, biasedProbability).toFixed(2)),
      stereotype,
    };
  }

  /** Model loss aversion (losses loom larger than gains). */
  lossAversion(gain: number, loss: number): { valueGain: number; valueLoss: number; asymmetry: number } {
    const lambda = 2.25;
    const valueGain = Math.pow(gain, 0.88);
    const valueLoss = -lambda * Math.pow(loss, 0.88);
    return {
      valueGain: Number(valueGain.toFixed(2)),
      valueLoss: Number(valueLoss.toFixed(2)),
      asymmetry: lambda,
    };
  }

  /** Model endowment effect (owners value goods more). */
  endowmentEffect(value: number, owner: boolean): { wtp: number; wta: number; ratio: number } {
    const wtp = owner ? value * 0.5 : value;
    const wta = owner ? value * 1.5 : value;
    return {
      wtp: Number(wtp.toFixed(2)),
      wta: Number(wta.toFixed(2)),
      ratio: Number((wta / Math.max(0.01, wtp)).toFixed(2)),
    };
  }

  /** Model status-quo bias. */
  statusQuoBias(current: string, alternative: string): { stickiness: number; switchingCost: number } {
    return {
      stickiness: 0.6,
      switchingCost: 0.2,
    };
  }

  /** Model framing effect. */
  framingEffect(frame: 'gain' | 'loss', choice: string): { preference: string; shift: number } {
    const shift = frame === 'loss' ? 0.3 : -0.1;
    return {
      preference: frame === 'loss' ? 'risk-seeking' : 'risk-averse',
      shift,
    };
  }

  /** Model sunk-cost fallacy. */
  sunkCostFallacy(sunk: number, future: number): { continueProject: boolean; irrationality: number } {
    const continueProject = sunk > future * 0.5;
    return {
      continueProject,
      irrationality: Number((sunk / Math.max(1, sunk + future)).toFixed(2)),
    };
  }

  /** Model confirmation bias. */
  confirmationBias(prior: number, evidence: { supports: boolean; strength: number }[]): { posterior: number; asymmetry: number } {
    let posterior = prior;
    for (const e of evidence) {
      const weight = e.supports ? 0.15 : 0.05;
      posterior = e.supports ? posterior + weight * e.strength : posterior - weight * e.strength * 0.5;
    }
    posterior = Math.max(0, Math.min(1, posterior));
    return {
      posterior: Number(posterior.toFixed(3)),
      asymmetry: 0.5,
    };
  }

  /** Model overconfidence bias. */
  overconfidence(estimate: number, actual: number): { overconfidence: number; calibration: number } {
    const overconfidence = (estimate - actual) / Math.max(1, actual);
    return {
      overconfidence: Number(overconfidence.toFixed(3)),
      calibration: Number((1 - Math.abs(overconfidence)).toFixed(3)),
    };
  }

  /** Model hindsight bias. */
  hindsightBias(event: string, prediction: number): { perceivedPredictability: number; actualPredictability: number; bias: number } {
    const actual = prediction;
    const perceived = Math.min(1, prediction + 0.25);
    return {
      perceivedPredictability: Number(perceived.toFixed(2)),
      actualPredictability: Number(actual.toFixed(2)),
      bias: Number((perceived - actual).toFixed(2)),
    };
  }

  /** Build a nudge intervention. */
  nudge(behavior: string, intervention: string): Nudge {
    const n: Nudge = {
      type: 'default',
      intervention,
      target: behavior,
      expectedEffect: 0.15,
    };
    this._nudges.push(n);
    this._history.push({ op: 'nudge', behavior });
    return n;
  }

  /** Design choice architecture. */
  choiceArchitecture(options: string[], defaultOption: string): ChoiceArchitecture {
    return {
      options,
      default: defaultOption,
      frame: 'neutral',
      complexity: options.length,
    };
  }

  /** Compute prospect theory value. */
  prospectTheory(gains: number, losses: number, probabilities: number[]): ProspectValue {
    const lambda = 2.25;
    const alpha = 0.88;
    const gamma = 0.61;
    const valueGain = probabilities.reduce((s, p) => s + Math.pow(p, gamma) * Math.pow(gains, alpha), 0);
    const valueLoss = probabilities.reduce((s, p) => s + Math.pow(p, gamma) * (-lambda * Math.pow(losses, alpha)), 0);
    const weighting = probabilities.map(p => Number(Math.pow(p, gamma).toFixed(3)));
    return {
      gains,
      losses,
      probabilities,
      value: Number((valueGain + valueLoss).toFixed(3)),
      weighting,
    };
  }

  private _seedBiases(): void {
    const biases: Bias[] = [
      { name: 'anchoring', description: 'rely on first piece of information', effect: 0.4, domain: 'judgment' },
      { name: 'availability', description: 'overweight easily recalled examples', effect: 0.3, domain: 'judgment' },
      { name: 'representativeness', description: 'judge by stereotype similarity', effect: 0.35, domain: 'judgment' },
      { name: 'loss-aversion', description: 'losses loom larger than gains', effect: 2.25, domain: 'decision' },
      { name: 'endowment', description: 'owners value goods more', effect: 1.5, domain: 'decision' },
      { name: 'confirmation', description: 'seek confirming evidence', effect: 0.5, domain: 'judgment' },
    ];
    for (const b of biases) this._biases.set(b.name, b);
  }

  toPacket(): DataPacket<{
    biases: number;
    nudges: Nudge[];
    preferences: Preference[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['economics_extended', 'BehavioralEconomics'],
      priority: 1,
      phase: 'behavioral-economics',
    };
    return {
      id: `behavioral-economics-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        biases: this._biases.size,
        nudges: [...this._nudges],
        preferences: [...this._preferences],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._biases.clear();
    this._nudges = [];
    this._preferences = [];
    this._history = [];
    this._counter = 0;
    this._seedBiases();
  }
}
