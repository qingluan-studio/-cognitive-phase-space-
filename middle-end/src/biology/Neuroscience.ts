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

/** Brain region in the central nervous system. */
export interface BrainRegion {
  id: string;
  name: string;
  lobe: string;
  function: string;
  neuronsMillions: number;
  volumeCm3: number;
}

/** Neurotransmitter descriptor. */
export interface NeurotransmitterInfo {
  name: string;
  class: 'small-molecule' | 'neuropeptide' | 'gas';
  precursor: string;
  receptors: string[];
  function: string;
  examplePathway: string;
}

/** Receptor type (ionotropic vs metabotropic). */
export interface ReceptorInfo {
  name: string;
  type: 'ionotropic' | 'metabotropic';
  neurotransmitter: string;
  ion: string;
  effect: 'excitatory' | 'inhibitory' | 'modulatory';
  timeScale: string;
}

/** Brain wave band. */
export interface BrainWaveBand {
  band: string;
  rangeHz: [number, number];
  state: string;
  amplitude: number;
}

/** Ion channel. */
export interface IonChannel {
  name: string;
  ion: string;
  gating: 'voltage' | 'ligand' | 'mechanical' | 'leak';
  conductance: number; // pS
}

/** Cable theory parameters. */
export interface CableParams {
  length: number; // mm
  diameter: number; // µm
  Rm: number; // Ω·cm² (membrane resistance)
  Ri: number; // Ω·cm (axoplasmic resistivity)
  Cm: number; // µF/cm² (membrane capacitance)
}

/** Synaptic plasticity record. */
export interface PlasticityEvent {
  type: 'LTP' | 'LTD' | 'STDP';
  synapseId: string;
  magnitude: number;
  timestamp: number;
}

/** EEG electrode placement (10-20 system). */
export interface EegElectrode {
  code: string;
  location: string;
  lobe: string;
}

/** History record. */
interface NeuroscienceRecord {
  method: string;
  target: string;
  timestamp: number;
}

const BRAIN_REGIONS: BrainRegion[] = [
  { id: 'r1', name: 'Prefrontal Cortex', lobe: 'frontal', function: 'executive function, planning, decision-making', neuronsMillions: 140, volumeCm3: 70 },
  { id: 'r2', name: 'Primary Motor Cortex', lobe: 'frontal', function: 'voluntary motor control', neuronsMillions: 30, volumeCm3: 30 },
  { id: 'r3', name: 'Broca\'s Area', lobe: 'frontal', function: 'speech production', neuronsMillions: 20, volumeCm3: 6 },
  { id: 'r4', name: 'Primary Somatosensory Cortex', lobe: 'parietal', function: 'tactile sensation', neuronsMillions: 30, volumeCm3: 30 },
  { id: 'r5', name: 'Primary Visual Cortex (V1)', lobe: 'occipital', function: 'visual processing', neuronsMillions: 140, volumeCm3: 25 },
  { id: 'r6', name: 'Primary Auditory Cortex', lobe: 'temporal', function: 'auditory processing', neuronsMillions: 30, volumeCm3: 15 },
  { id: 'r7', name: 'Wernicke\'s Area', lobe: 'temporal', function: 'language comprehension', neuronsMillions: 20, volumeCm3: 8 },
  { id: 'r8', name: 'Hippocampus', lobe: 'temporal', function: 'memory consolidation, spatial navigation', neuronsMillions: 20, volumeCm3: 6 },
  { id: 'r9', name: 'Amygdala', lobe: 'temporal', function: 'emotion, fear conditioning', neuronsMillions: 13, volumeCm3: 1.5 },
  { id: 'r10', name: 'Thalamus', lobe: 'diencephalon', function: 'sensory relay station', neuronsMillions: 14, volumeCm3: 16 },
  { id: 'r11', name: 'Hypothalamus', lobe: 'diencephalon', function: 'homeostasis, endocrine control', neuronsMillions: 0.5, volumeCm3: 4 },
  { id: 'r12', name: 'Cerebellum', lobe: 'hindbrain', function: 'motor coordination, balance', neuronsMillions: 69000, volumeCm3: 150 },
  { id: 'r13', name: 'Medulla', lobe: 'hindbrain', function: 'autonomic functions (breathing, heart rate)', neuronsMillions: 5, volumeCm3: 6 },
  { id: 'r14', name: 'Substantia Nigra', lobe: 'midbrain', function: 'dopaminergic motor control', neuronsMillions: 0.4, volumeCm3: 1 },
  { id: 'r15', name: 'VTA (Ventral Tegmental Area)', lobe: 'midbrain', function: 'reward, dopamine', neuronsMillions: 0.5, volumeCm3: 1.5 },
  { id: 'r16', name: 'Corpus Callosum', lobe: 'subcortical', function: 'interhemispheric communication', neuronsMillions: 200, volumeCm3: 10 },
  { id: 'r17', name: 'Basal Ganglia', lobe: 'subcortical', function: 'motor planning, learning', neuronsMillions: 100, volumeCm3: 25 },
  { id: 'r18', name: 'Pons', lobe: 'hindbrain', function: 'relay to cerebellum, sleep', neuronsMillions: 20, volumeCm3: 20 },
];

const NEUROTRANSMITTERS: NeurotransmitterInfo[] = [
  { name: 'Glutamate', class: 'small-molecule', precursor: 'alpha-ketoglutarate', receptors: ['AMPA', 'NMDA', 'kainate', 'mGluR'], function: 'primary excitatory', examplePathway: 'Cortical signaling' },
  { name: 'GABA', class: 'small-molecule', precursor: 'glutamate', receptors: ['GABA-A', 'GABA-B', 'GABA-C'], function: 'primary inhibitory', examplePathway: 'Interneuron inhibition' },
  { name: 'Glycine', class: 'small-molecule', precursor: 'serine', receptors: ['glycine receptor'], function: 'inhibitory in spinal cord', examplePathway: 'Renshaw cell inhibition' },
  { name: 'Acetylcholine (ACh)', class: 'small-molecule', precursor: 'choline + acetyl-CoA', receptors: ['nicotinic (nAChR)', 'muscarinic (mAChR)'], function: 'NMJ transmission, memory', examplePathway: 'Neuromuscular junction' },
  { name: 'Dopamine', class: 'small-molecule', precursor: 'tyrosine → L-DOPA', receptors: ['D1', 'D2', 'D3', 'D4', 'D5'], function: 'reward, motor control', examplePathway: 'Mesolimbic reward' },
  { name: 'Norepinephrine', class: 'small-molecule', precursor: 'dopamine', receptors: ['alpha-1', 'alpha-2', 'beta-1', 'beta-2', 'beta-3'], function: 'arousal, attention', examplePathway: 'LC-NE arousal' },
  { name: 'Epinephrine', class: 'small-molecule', precursor: 'norepinephrine', receptors: ['alpha', 'beta'], function: 'fight-or-flight', examplePathway: 'Adrenal medulla' },
  { name: 'Serotonin (5-HT)', class: 'small-molecule', precursor: 'tryptophan → 5-HTP', receptors: ['5-HT1', '5-HT2', '5-HT3', '5-HT4', '5-HT5', '5-HT6', '5-HT7'], function: 'mood, sleep, appetite', examplePathway: 'Raphe nuclei' },
  { name: 'Histamine', class: 'small-molecule', precursor: 'histidine', receptors: ['H1', 'H2', 'H3', 'H4'], function: 'wakefulness, arousal', examplePathway: 'Tuberomammillary nucleus' },
  { name: 'ATP/Adenosine', class: 'small-molecule', precursor: 'ATP', receptors: ['P2X', 'P2Y', 'A1', 'A2A', 'A2B', 'A3'], function: 'purinergic signaling', examplePathway: 'Sleep pressure (adenosine)' },
  { name: 'Nitric Oxide (NO)', class: 'gas', precursor: 'L-arginine', receptors: ['soluble guanylate cyclase'], function: 'vasodilation, retrograde signaling', examplePathway: 'Vasodilation' },
  { name: 'Carbon Monoxide (CO)', class: 'gas', precursor: 'heme', receptors: ['soluble guanylate cyclase'], function: 'neuromodulation', examplePathway: 'Smooth muscle relaxation' },
  { name: 'Oxytocin', class: 'neuropeptide', precursor: 'prepro-oxytocin', receptors: ['OXTR'], function: 'social bonding, lactation', examplePathway: 'PVN → posterior pituitary' },
  { name: 'Vasopressin (ADH)', class: 'neuropeptide', precursor: 'prepro-pressophysin', receptors: ['V1a', 'V1b', 'V2'], function: 'water retention, social behavior', examplePathway: 'PVN → posterior pituitary' },
  { name: 'Endorphins', class: 'neuropeptide', precursor: 'POMC', receptors: ['mu-opioid', 'delta-opioid', 'kappa-opioid'], function: 'pain relief, reward', examplePathway: 'PAG → spinal cord' },
  { name: 'Substance P', class: 'neuropeptide', precursor: 'preprotachykinin', receptors: ['NK1'], function: 'pain transmission', examplePathway: 'Pain pathway' },
  { name: 'CCK (Cholecystokinin)', class: 'neuropeptide', precursor: 'prepro-CCK', receptors: ['CCK-A', 'CCK-B'], function: 'satiety, anxiety', examplePathway: 'Satiety signaling' },
  { name: 'Neuropeptide Y', class: 'neuropeptide', precursor: 'prepro-NPY', receptors: ['Y1', 'Y2', 'Y4', 'Y5', 'Y6'], function: 'appetite, anxiety', examplePathway: 'Arcuate nucleus' },
];

const RECEPTORS: ReceptorInfo[] = [
  { name: 'AMPA', type: 'ionotropic', neurotransmitter: 'glutamate', ion: 'Na+/K+', effect: 'excitatory', timeScale: '1-10 ms' },
  { name: 'NMDA', type: 'ionotropic', neurotransmitter: 'glutamate', ion: 'Na+/Ca2+', effect: 'excitatory', timeScale: '10-100 ms' },
  { name: 'Kainate', type: 'ionotropic', neurotransmitter: 'glutamate', ion: 'Na+/K+', effect: 'excitatory', timeScale: '1-10 ms' },
  { name: 'GABA-A', type: 'ionotropic', neurotransmitter: 'GABA', ion: 'Cl-', effect: 'inhibitory', timeScale: '1-10 ms' },
  { name: 'GABA-B', type: 'metabotropic', neurotransmitter: 'GABA', ion: 'K+', effect: 'inhibitory', timeScale: '100-500 ms' },
  { name: 'Glycine R', type: 'ionotropic', neurotransmitter: 'glycine', ion: 'Cl-', effect: 'inhibitory', timeScale: '1-10 ms' },
  { name: 'nAChR', type: 'ionotropic', neurotransmitter: 'acetylcholine', ion: 'Na+/K+', effect: 'excitatory', timeScale: '1-10 ms' },
  { name: 'mAChR (M1-M5)', type: 'metabotropic', neurotransmitter: 'acetylcholine', ion: 'various', effect: 'modulatory', timeScale: '100-500 ms' },
  { name: '5-HT3', type: 'ionotropic', neurotransmitter: 'serotonin', ion: 'Na+/K+', effect: 'excitatory', timeScale: '1-10 ms' },
  { name: '5-HT1, 5-HT2', type: 'metabotropic', neurotransmitter: 'serotonin', ion: 'various', effect: 'modulatory', timeScale: '100-500 ms' },
  { name: 'D1, D5', type: 'metabotropic', neurotransmitter: 'dopamine', ion: 'Gs/Gq', effect: 'excitatory (modulatory)', timeScale: '100-500 ms' },
  { name: 'D2, D3, D4', type: 'metabotropic', neurotransmitter: 'dopamine', ion: 'Gi', effect: 'inhibitory (modulatory)', timeScale: '100-500 ms' },
];

const BRAIN_WAVE_BANDS: BrainWaveBand[] = [
  { band: 'delta', rangeHz: [0.5, 4], state: 'deep sleep (N3)', amplitude: 100 },
  { band: 'theta', rangeHz: [4, 8], state: 'drowsiness, meditation, REM', amplitude: 50 },
  { band: 'alpha', rangeHz: [8, 13], state: 'relaxed wakefulness', amplitude: 30 },
  { band: 'beta', rangeHz: [13, 30], state: 'alert wakefulness, active thinking', amplitude: 20 },
  { band: 'gamma', rangeHz: [30, 100], state: 'cognitive processing, consciousness', amplitude: 5 },
  { band: 'mu', rangeHz: [8, 13], state: 'motor cortex resting', amplitude: 25 },
];

const ION_CHANNELS: IonChannel[] = [
  { name: 'Voltage-gated Na+ (Nav1.1-1.9)', ion: 'Na+', gating: 'voltage', conductance: 15 },
  { name: 'Voltage-gated K+ (Kv1-12)', ion: 'K+', gating: 'voltage', conductance: 10 },
  { name: 'Voltage-gated Ca2+ (Cav1-3)', ion: 'Ca2+', gating: 'voltage', conductance: 5 },
  { name: 'HCN (Hyperpolarization-activated)', ion: 'Na+/K+', gating: 'voltage', conductance: 1 },
  { name: 'K2P (Two-pore K+ leak)', ion: 'K+', gating: 'leak', conductance: 8 },
  { name: 'nAChR (nicotinic)', ion: 'Na+', gating: 'ligand', conductance: 40 },
  { name: 'GABA-A', ion: 'Cl-', gating: 'ligand', conductance: 30 },
  { name: 'NMDA', ion: 'Ca2+/Na+', gating: 'ligand', conductance: 50 },
  { name: 'AMPA', ion: 'Na+', gating: 'ligand', conductance: 25 },
  { name: 'TRPV1', ion: 'Ca2+/Na+', gating: 'mechanical', conductance: 80 },
];

const EEG_ELECTRODES: EegElectrode[] = [
  { code: 'Fp1', location: 'left prefrontal', lobe: 'frontal' },
  { code: 'Fp2', location: 'right prefrontal', lobe: 'frontal' },
  { code: 'F3', location: 'left frontal', lobe: 'frontal' },
  { code: 'F4', location: 'right frontal', lobe: 'frontal' },
  { code: 'Fz', location: 'midline frontal', lobe: 'frontal' },
  { code: 'C3', location: 'left central', lobe: 'central' },
  { code: 'C4', location: 'right central', lobe: 'central' },
  { code: 'Cz', location: 'midline central', lobe: 'central' },
  { code: 'P3', location: 'left parietal', lobe: 'parietal' },
  { code: 'P4', location: 'right parietal', lobe: 'parietal' },
  { code: 'Pz', location: 'midline parietal', lobe: 'parietal' },
  { code: 'O1', location: 'left occipital', lobe: 'occipital' },
  { code: 'O2', location: 'right occipital', lobe: 'occipital' },
  { code: 'T3', location: 'left temporal', lobe: 'temporal' },
  { code: 'T4', location: 'right temporal', lobe: 'temporal' },
  { code: 'T5', location: 'left posterior temporal', lobe: 'temporal' },
  { code: 'T6', location: 'right posterior temporal', lobe: 'temporal' },
];

/** Neuroscience: neurons, synapses, potentials. */
export class Neuroscience {
  private _neurons: Neuron[] = [];
  private _synapses: Synapse[] = [];
  private _potentials: ActionPotential[] = [];
  private _plasticity: PlasticityEvent[] = [];
  private _history: NeuroscienceRecord[] = [];
  private _counter = 0;

  /** Resting membrane potential in mV. */
  restingPotential(): number {
    this._history.push({ method: 'restingPotential', target: '-70 mV', timestamp: Date.now() });
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
    this._history.push({ method: 'actionPotential', target: `stimulus=${stimulus}`, timestamp: Date.now() });
    return potential;
  }

  /** Full action potential waveform (Hodgkin-Huxley simplified). */
  actionPotentialWaveform(steps: number = 100, dt: number = 0.1): Array<{ t: number; v: number }> {
    const series: Array<{ t: number; v: number }> = [];
    let v = -70;
    let n = 0.32, m = 0.05, h = 0.6; // gating variables at rest
    const gK = 36, gNa = 120, gL = 0.3;
    const eK = -77, eNa = 50, eL = -54.4;
    const c = 1; // µF/cm²
    for (let i = 0; i < steps; i++) {
      // Stimulus: brief 10 µA/cm² pulse at t=5ms
      const I = (i * dt > 5 && i * dt < 6) ? 10 : 0;
      const alphaN = 0.01 * (10 - v) / (Math.exp((10 - v) / 10) - 1);
      const betaN = 0.125 * Math.exp(-v / 80);
      const alphaM = 0.1 * (25 - v) / (Math.exp((25 - v) / 10) - 1);
      const betaM = 4 * Math.exp(-v / 18);
      const alphaH = 0.07 * Math.exp(-v / 20);
      const betaH = 1 / (Math.exp((30 - v) / 10) + 1);
      n += dt * (alphaN * (1 - n) - betaN * n);
      m += dt * (alphaM * (1 - m) - betaM * m);
      h += dt * (alphaH * (1 - h) - betaH * h);
      const iK = gK * Math.pow(n, 4) * (v - eK);
      const iNa = gNa * Math.pow(m, 3) * h * (v - eNa);
      const iL = gL * (v - eL);
      const dv = (I - iK - iNa - iL) / c;
      v += dt * dv;
      series.push({ t: i * dt, v: Math.round(v * 100) / 100 });
    }
    this._history.push({ method: 'actionPotentialWaveform', target: `${steps} steps`, timestamp: Date.now() });
    return series;
  }

  /** Nernst equation: E_ion = (RT/zF) * ln([out]/[in]). */
  nernstEquation(ion: string, inside: number, outside: number): number {
    const z: Record<string, number> = { K: 1, Na: 1, Cl: -1, Ca: 2 };
    const charge = z[ion] ?? 1;
    if (inside <= 0) return 0;
    const E = (8.314 * 310 / (charge * 96485)) * Math.log(outside / inside) * 1000;
    this._history.push({ method: 'nernstEquation', target: ion, timestamp: Date.now() });
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
    this._history.push({ method: 'goldmanEquation', target: `${ions.length} ions`, timestamp: Date.now() });
    return Vm;
  }

  /** Standard neuron at rest (typical mammalian values). */
  restingIonConcentrations(): Array<{ ion: string; in: number; out: number; ek: number }> {
    const ions = [
      { ion: 'K', in: 140, out: 5 },
      { ion: 'Na', in: 15, out: 145 },
      { ion: 'Cl', in: 10, out: 110 },
      { ion: 'Ca', in: 0.0001, out: 2.5 },
    ];
    return ions.map(i => ({ ...i, ek: this.nernstEquation(i.ion, i.in, i.out) }));
  }

  /** Cable theory: length constant λ = sqrt(Rm * d / (4 * Ri)). */
  lengthConstant(cable: CableParams): number {
    // λ in cm
    return Math.sqrt((cable.Rm * cable.diameter * 1e-4) / (4 * cable.Ri));
  }

  /** Time constant τ = Rm * Cm. */
  timeConstant(cable: CableParams): number {
    // τ in ms (Rm in Ω·cm², Cm in µF/cm² → τ = ms)
    return (cable.Rm * cable.Cm) / 1000;
  }

  /** Input resistance Rin = Rm / (π * d * L) (for cylindrical cell). */
  inputResistance(cable: CableParams): number {
    const dCm = cable.diameter * 1e-4;
    const lCm = cable.length / 10;
    if (dCm === 0 || lCm === 0) return 0;
    return cable.Rm / (Math.PI * dCm * lCm);
  }

  /** Electrotonic potential at distance x: V(x) = V0 * exp(-x/λ). */
  electrotonicDecay(v0: number, distance: number, lambda: number): number {
    if (lambda === 0) return 0;
    return v0 * Math.exp(-distance / lambda);
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
    this._history.push({ method: 'synapticTransmission', target: neurotransmitter, timestamp: Date.now() });
    return { neurotransmitter, receptor, effect };
  }

  /** Miniature end-plate potential (MEPP) amplitude. */
  meppAmplitude(vesicleSize: number = 1, postSynapticResponse: number = 0.4): number {
    return vesicleSize * postSynapticResponse;
  }

  /** Quantal content: m = EPP / MEPP. */
  quantalContent(eppAmplitude: number, meppAmplitude: number): number {
    if (meppAmplitude === 0) return 0;
    return eppAmplitude / meppAmplitude;
  }

  /** Poisson release probability: P(k) = e^(-m) * m^k / k!. */
  quantalRelease(m: number, k: number): number {
    if (k < 0) return 0;
    let kf = 1;
    for (let i = 2; i <= k; i++) kf *= i;
    return Math.exp(-m) * Math.pow(m, k) / Math.max(1, kf);
  }

  /** Excitatory postsynaptic potential (EPSP) - simplified sum. */
  epsp(quantalSize: number, quantalCount: number, reversal: number = 0, currentVm: number = -70): number {
    const driving = reversal - currentVm;
    return quantalSize * quantalCount * driving / 100;
  }

  /** Inhibitory postsynaptic potential (IPSP). */
  ipsp(quantalSize: number, quantalCount: number, reversal: number = -80, currentVm: number = -70): number {
    const driving = reversal - currentVm;
    return quantalSize * quantalCount * driving / 100;
  }

  /** Spatial summation of synaptic inputs. */
  spatialSummation(inputs: number[]): number {
    return inputs.reduce((s, x) => s + x, 0);
  }

  /** Temporal summation with decay. */
  temporalSummation(inputs: number[], tau: number = 10, dt: number = 1): number {
    let sum = 0;
    for (const x of inputs) {
      sum = sum * Math.exp(-dt / Math.max(0.001, tau)) + x;
    }
    return sum;
  }

  /** Neural coding analysis. */
  neuralCoding(stimulus: number, response: number): { rate: number; efficiency: number } {
    const rate = stimulus === 0 ? 0 : response / stimulus;
    this._history.push({ method: 'neuralCoding', target: `r=${rate.toFixed(2)}`, timestamp: Date.now() });
    return { rate, efficiency: Math.min(1, rate) };
  }

  /** Firing rate adaptation (Benda-Herz model simplified). */
  firingRateAdaptation(initialRate: number, adaptationStrength: number, time: number, tauA: number = 100): number {
    return initialRate * Math.exp(-adaptationStrength * time / Math.max(1, tauA));
  }

  /** Refractory period descriptor. */
  refractoryPeriod(type: 'absolute' | 'relative'): { type: string; duration: number } {
    const duration = type === 'absolute' ? 1 : 5;
    this._history.push({ method: 'refractoryPeriod', target: type, timestamp: Date.now() });
    return { type, duration };
  }

  /** Frequency-current (F-I) curve, simplified linear-threshold. */
  fiCurve(current: number, threshold: number = 5, gain: number = 10, maxRate: number = 200): number {
    if (current < threshold) return 0;
    return Math.min(maxRate, gain * (current - threshold));
  }

  /** Hebbian learning: 'cells that fire together wire together'. */
  hebbianLearning(pre: number, post: number, strength: number): { newStrength: number; delta: number } {
    const delta = pre * post * 0.01;
    const newStrength = Math.max(0, Math.min(1, strength + delta));
    this._history.push({ method: 'hebbianLearning', target: `delta=${delta.toFixed(4)}`, timestamp: Date.now() });
    return { newStrength, delta };
  }

  /** Oja's rule (Hebbian with normalization). */
  ojaRule(pre: number, post: number, strength: number, learningRate: number = 0.01): number {
    // Δw = α * y * (x - y * w)
    return strength + learningRate * post * (pre - post * strength);
  }

  /** BCM (Bienenstock-Cooper-Munro) rule. */
  bcmRule(pre: number, post: number, strength: number, theta: number, learningRate: number = 0.01): number {
    // Δw = φ * y * (y - θ) * x
    return strength + learningRate * post * (post - theta) * pre;
  }

  /** Long-term potentiation (LTP). */
  ltp(neurons: string[]): { potentiated: string[]; strength: number } {
    this._history.push({ method: 'ltp', target: `${neurons.length} cells`, timestamp: Date.now() });
    this._plasticity.push({ type: 'LTP', synapseId: neurons.join('+'), magnitude: 0.9, timestamp: Date.now() });
    return { potentiated: neurons, strength: 0.9 };
  }

  /** Long-term depression (LTD). */
  ltd(neurons: string[]): { depressed: string[]; strength: number } {
    this._history.push({ method: 'ltd', target: `${neurons.length} cells`, timestamp: Date.now() });
    this._plasticity.push({ type: 'LTD', synapseId: neurons.join('+'), magnitude: 0.2, timestamp: Date.now() });
    return { depressed: neurons, strength: 0.2 };
  }

  /** Spike-timing-dependent plasticity (STDP). */
  stdp(preFireTime: number, postFireTime: number, currentStrength: number, aPlus: number = 0.01, aMinus: number = 0.012, tauPlus: number = 20, tauMinus: number = 20): number {
    const deltaT = postFireTime - preFireTime; // ms
    let newStrength = currentStrength;
    if (deltaT > 0) {
      // LTP
      newStrength += aPlus * Math.exp(-deltaT / Math.max(1, tauPlus));
    } else if (deltaT < 0) {
      // LTD
      newStrength -= aMinus * Math.exp(deltaT / Math.max(1, tauMinus));
    }
    newStrength = Math.max(0, Math.min(1, newStrength));
    this._plasticity.push({ type: 'STDP', synapseId: `${preFireTime}-${postFireTime}`, magnitude: newStrength, timestamp: Date.now() });
    this._history.push({ method: 'stdp', target: `Δt=${deltaT}`, timestamp: Date.now() });
    return newStrength;
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
    this._history.push({ method: 'brainWaves', target: `${frequency} Hz`, timestamp: Date.now() });
    return { band, range: entry.range, state: entry.state };
  }

  /** All brain wave bands. */
  brainWaveBands(): BrainWaveBand[] {
    return [...BRAIN_WAVE_BANDS];
  }

  /** Classify frequency into brain wave band. */
  classifyBrainWave(frequencyHz: number): BrainWaveBand | null {
    return BRAIN_WAVE_BANDS.find(b => frequencyHz >= b.rangeHz[0] && frequencyHz < b.rangeHz[1]) ?? null;
  }

  /** Catalog of major neurotransmitters. */
  neurotransmitters(): NeurotransmitterInfo[] {
    this._history.push({ method: 'neurotransmitters', target: `${NEUROTRANSMITTERS.length} NTs`, timestamp: Date.now() });
    return [...NEUROTRANSMITTERS];
  }

  /** Lookup neurotransmitter by name. */
  getNeurotransmitter(name: string): NeurotransmitterInfo | null {
    return NEUROTRANSMITTERS.find(n => n.name.toLowerCase().includes(name.toLowerCase())) ?? null;
  }

  /** Receptors catalog. */
  receptors(): ReceptorInfo[] {
    return [...RECEPTORS];
  }

  /** Ion channels catalog. */
  ionChannels(): IonChannel[] {
    return [...ION_CHANNELS];
  }

  /** Brain regions catalog. */
  brainRegions(): BrainRegion[] {
    return [...BRAIN_REGIONS];
  }

  /** Lookup brain region by ID. */
  getBrainRegion(id: string): BrainRegion | null {
    return BRAIN_REGIONS.find(r => r.id === id) ?? null;
  }

  /** EEG electrode placements (10-20 system). */
  eegElectrodes(): EegElectrode[] {
    return [...EEG_ELECTRODES];
  }

  /** Brain mass scaling (allometric): brain_mass = c * body_mass^0.75. */
  brainMassScaling(bodyMassKg: number): number {
    // Human brain ~1.4 kg at 70 kg body
    return 0.1 * Math.pow(bodyMassKg, 0.75);
  }

  /** Number of neurons scaling (Herculano-Houzel): N = c * M^p. */
  neuronCountScaling(brainMassG: number): number {
    // ~ for primates: N ≈ 6.95 * M(brain, g) millions
    return Math.round(6.95 * brainMassG);
  }

  /** Cerebral cortex surface area (cat) scaling. */
  corticalSurfaceArea(brainMassG: number): number {
    return 0.5 * Math.pow(brainMassG, 0.9);
  }

  /** Conduction velocity for myelinated vs unmyelinated axons. */
  conductionVelocity(diameterMicrom: number, myelinated: boolean): number {
    // Hursh factor: 6 m/s per µm diameter (myelinated); 1.5 m/s per sqrt(µm) (unmyelinated)
    if (myelinated) return 6 * diameterMicrom;
    return 1.5 * Math.sqrt(diameterMicrom);
  }

  /** Synaptic delay estimation. */
  synapticDelay(distance: number, velocity: number): number {
    if (velocity === 0) return 0;
    return distance / velocity;
  }

  /** Membrane capacitance of cell with given diameter. */
  membraneCapacitance(diameterMicrom: number, specificCapacitance: number = 1): number {
    const radiusCm = (diameterMicrom / 2) * 1e-4;
    const areaCm2 = 4 * Math.PI * radiusCm * radiusCm;
    return specificCapacitance * areaCm2;
  }

  /** Compartmental model: passive membrane with leak. */
  passiveMembraneV(current: number, resistance: number, leakPotential: number = -70): number {
    // V = V_leak + I * R
    return leakPotential + current * resistance;
  }

  /** Glial cell buffering of extracellular K+. */
  glialBuffering(extracellularK: number, threshold: number = 5): { buffered: number; status: string } {
    if (extracellularK > threshold) {
      return { buffered: extracellularK * 0.5, status: 'high - active buffering' };
    }
    return { buffered: extracellularK, status: 'normal' };
  }

  /** Brain metabolic rate (CMRglc) - glucose consumption. */
  cerebralMetabolicRate(): { glucoseMgPerMinPer100g: number; oxygenMlPerMinPer100g: number } {
    return {
      glucoseMgPerMinPer100g: 30, // mg/100g/min
      oxygenMlPerMinPer100g: 3.5, // ml/100g/min
    };
  }

  /** Cerebral blood flow (CBF) estimate by region. */
  cerebralBloodFlow(region: string): number {
    const flows: Record<string, number> = {
      cortex: 50,
      whiteMatter: 20,
      grayMatter: 60,
      hippocampus: 40,
      cerebellum: 35,
      thalamus: 45,
      basalGanglia: 40,
      brainstem: 30,
    };
    return flows[region] ?? 40;
  }

  /** Brain metabolic coupling (CMRO2 = CBF * OEF * Ca). */
  metabolicCoupling(cbf: number, oef: number = 0.4, arterialO2: number = 20): number {
    return cbf * oef * arterialO2;
  }

  /** Sleep architecture cycle. */
  sleepArchitecture(): Array<{ stage: string; nremPercent: number; description: string }> {
    return [
      { stage: 'N1', nremPercent: 5, description: 'transition from wake to sleep' },
      { stage: 'N2', nremPercent: 45, description: 'light sleep, sleep spindles, K-complexes' },
      { stage: 'N3', nremPercent: 25, description: 'deep slow-wave sleep (SWS)' },
      { stage: 'REM', nremPercent: 25, description: 'rapid eye movement, vivid dreams, atonia' },
    ];
  }

  /** Circadian rhythm phase markers. */
  circadianRhythm(hourOfDay: number): { phase: string; melatoninLevel: number; coreBodyTempC: number } {
    // Melatonin peaks at night, body temperature lowest at ~5am
    const melatonin = hourOfDay < 6 || hourOfDay > 22 ? 60 : hourOfDay < 8 || hourOfDay > 20 ? 30 : 5;
    const temp = 36.5 + Math.cos((hourOfDay - 18) * Math.PI / 12) * 0.4;
    let phase = 'daytime';
    if (hourOfDay < 6) phase = 'biological night';
    else if (hourOfDay < 12) phase = 'morning';
    else if (hourOfDay < 18) phase = 'afternoon';
    else if (hourOfDay < 22) phase = 'evening';
    else phase = 'biological night';
    return { phase, melatoninLevel: melatonin, coreBodyTempC: Math.round(temp * 10) / 10 };
  }

  /** Visual pathway: retina → LGN → V1. */
  visualPathway(): Array<{ stage: string; function: string; latencyMs: number }> {
    return [
      { stage: 'retina (photoreceptors)', function: 'transduce light to neural signal', latencyMs: 0 },
      { stage: 'retina (ganglion cells)', function: 'action potentials', latencyMs: 10 },
      { stage: 'optic nerve', function: 'transmit', latencyMs: 30 },
      { stage: 'optic chiasm', function: 'decussation', latencyMs: 35 },
      { stage: 'LGN (lateral geniculate nucleus)', function: 'relay', latencyMs: 50 },
      { stage: 'optic radiations', function: 'transmit', latencyMs: 70 },
      { stage: 'V1 (primary visual cortex)', function: 'basic features', latencyMs: 90 },
      { stage: 'V2', function: 'contours, textures', latencyMs: 110 },
      { stage: 'V4 (ventral)', function: 'color, shape', latencyMs: 130 },
      { stage: 'MT/V5 (dorsal)', function: 'motion', latencyMs: 130 },
      { stage: 'IT (inferotemporal)', function: 'object recognition', latencyMs: 170 },
    ];
  }

  /** Auditory pathway. */
  auditoryPathway(): Array<{ stage: string; function: string }> {
    return [
      { stage: 'outer ear (pinna)', function: 'collect sound' },
      { stage: 'middle ear (ossicles)', function: 'impedance matching' },
      { stage: 'cochlea (hair cells)', function: 'mechanoelectrical transduction' },
      { stage: 'auditory nerve', function: 'transmit' },
      { stage: 'cochlear nucleus', function: 'first central station' },
      { stage: 'superior olivary complex', function: 'sound localization' },
      { stage: 'inferior colliculus', function: 'integration' },
      { stage: 'medial geniculate body', function: 'thalamic relay' },
      { stage: 'primary auditory cortex (A1)', function: 'frequency mapping' },
    ];
  }

  /** Weber's law: ΔI/I = constant. */
  weberLaw(intensity: number, weberFraction: number = 0.1): number {
    return intensity * weberFraction;
  }

  /** Fechner's law: S = k * ln(I/I0). */
  fechnerLaw(intensity: number, i0: number = 1, k: number = 1): number {
    if (intensity <= 0 || i0 <= 0) return 0;
    return k * Math.log(intensity / i0);
  }

  /** Stevens' power law: S = a * I^b. */
  stevensLaw(intensity: number, exponent: number, a: number = 1): number {
    if (intensity <= 0) return 0;
    return a * Math.pow(intensity, exponent);
  }

  /** Signal detection theory: d' = (μ_signal - μ_noise) / σ. */
  signalDetectionDPrime(signalMean: number, noiseMean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (signalMean - noiseMean) / stdDev;
  }

  /** Reaction time model: Hick's law RT = a + b * log2(n+1). */
  hicksLaw(choices: number, a: number = 200, b: number = 150): number {
    return a + b * Math.log2(choices + 1);
  }

  /** Fitts's law: MT = a + b * log2(2D/W). */
  fittsLaw(distance: number, width: number, a: number = 200, b: number = 100): number {
    if (width === 0) return 0;
    return a + b * Math.log2(2 * distance / width);
  }

  /** Add a custom neuron. */
  addNeuron(neuron: Neuron): void {
    this._neurons.push(neuron);
    this._history.push({ method: 'addNeuron', target: neuron.type, timestamp: Date.now() });
  }

  /** All plasticity events recorded. */
  plasticityEvents(): PlasticityEvent[] {
    return [...this._plasticity];
  }

  /** Reward prediction error (Schultz dopamine model): δ = R - V. */
  rewardPredictionError(reward: number, expectedValue: number): { rpe: number; result: 'positive' | 'negative' | 'neutral' } {
    const rpe = reward - expectedValue;
    let result: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (rpe > 0.001) result = 'positive';
    else if (rpe < -0.001) result = 'negative';
    this._history.push({ method: 'rewardPredictionError', target: `δ=${rpe.toFixed(3)}`, timestamp: Date.now() });
    return { rpe, result };
  }

  /** Temporal difference learning: TD-error δ_t = r_t + γV(s_{t+1}) - V(s_t). */
  tdError(reward: number, valueNext: number, valueCurrent: number, gamma: number = 0.9): number {
    return reward + gamma * valueNext - valueCurrent;
  }

  /** Rescorla-Wagner learning: ΔV = αβ(λ - ΣV). */
  rescorlaWagner(learningRate: number, maxConditioned: number, currentCS: number, totalV: number): number {
    return learningRate * maxConditioned * (currentCS - totalV);
  }

  /** Synaptic tagging and capture (STC): strong stimulus tags weak synapses. */
  synapticTagging(weakStimulusTime: number, strongStimulusTime: number, windowMs: number = 60 * 60 * 1000): { captured: boolean; lag: number } {
    const lag = strongStimulusTime - weakStimulusTime;
    const captured = lag >= 0 && lag <= windowMs;
    this._history.push({ method: 'synapticTagging', target: captured ? 'captured' : 'missed', timestamp: Date.now() });
    return { captured, lag };
  }

  /** Critical period plasticity windows. */
  criticalPeriods(): Array<{ system: string; onsetWeeks: number; closureWeeks: number; description: string }> {
    return [
      { system: 'Visual cortex (ocular dominance)', onsetWeeks: 0, closureWeeks: 52, description: 'monocular deprivation effect' },
      { system: 'Auditory cortex (tonotopy)', onsetWeeks: 0, closureWeeks: 12, description: 'language sound discrimination' },
      { system: 'Somatosensory (barrel cortex)', onsetWeeks: 0, closureWeeks: 16, description: 'whisker map formation' },
      { system: 'Language (phonology)', onsetWeeks: 0, closureWeeks: 312, description: 'native phoneme tuning (6y)' },
      { system: 'Filtration (birdsong)', onsetWeeks: 0, closureWeeks: 20, description: 'song template learning' },
      { system: 'Imprinting (filial)', onsetWeeks: 0, closureWeeks: 2, description: 'mother-offspring bond' },
    ];
  }

  /** Dopaminergic neurons per region (substantia nigra & VTA). */
  dopamineNeuronCounts(): { snpc: number; vta: number; total: number } {
    return { snpc: 550000, vta: 250000, total: 800000 };
  }

  /** Network graph metrics for brain connectivity. */
  brainNetworkMetrics(nodes: number, edges: number, avgPathLength: number, clustering: number): {
    density: number; smallWorldIndex: number;
  } {
    const maxEdges = nodes * (nodes - 1) / 2;
    const density = maxEdges > 0 ? edges / maxEdges : 0;
    // Small-world index: compare with random graph C/L ratio
    const cRandom = density;
    const lRandom = Math.log(nodes) / Math.log(Math.max(1, density * nodes));
    const smallWorldIndex = (cRandom > 0 && lRandom > 0) ? (clustering / cRandom) / (avgPathLength / lRandom) : 0;
    return { density, smallWorldIndex };
  }

  /** Cerebellar Purkinje cell firing rate modulation. */
  purkinjeFiring(baselineRate: number, complexSpikeRate: number): { simpleSpikeRate: number; modulation: number } {
    // Complex spikes suppress simple spikes
    const suppression = complexSpikeRate * 2;
    const simpleSpikeRate = Math.max(0, baselineRate - suppression);
    return { simpleSpikeRate, modulation: simpleSpikeRate - baselineRate };
  }

  /** Sleep spindles (stage 2 NREM). */
  sleepSpindles(): { frequencyHz: number; durationSec: number; role: string } {
    return {
      frequencyHz: 12,
      durationSec: 0.5,
      role: 'thalamocortical loop consolidation, sleep-dependent memory',
    };
  }

  /** K-complex (NREM stage 2 marker). */
  kComplex(): { amplitude: number; durationSec: number; trigger: string } {
    return { amplitude: 100, durationSec: 0.5, trigger: 'spontaneous or evoked cortical down-state' };
  }

  toPacket(): DataPacket<{
    neurons: Neuron[];
    synapses: Synapse[];
    potentials: ActionPotential[];
    plasticity: PlasticityEvent[];
    history: NeuroscienceRecord[];
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
        plasticity: this._plasticity,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._neurons = [];
    this._synapses = [];
    this._potentials = [];
    this._plasticity = [];
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

  get plasticityCount(): number {
    return this._plasticity.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
