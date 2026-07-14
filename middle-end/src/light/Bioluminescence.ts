export interface LuminescentNode {
  id: string;
  intensity: number;
  wavelength: number;
  active: boolean;
}

export type GlowSpectrum = {
  peakWavelength: number;
  totalIntensity: number;
  bandwidth: number;
};

export interface BioluminescenceConfig {
  baseIntensity: number;
  decayRate: number;
  quantumYield: number;
}

export class Bioluminescence {
  private _config: BioluminescenceConfig;
  private _nodes: LuminescentNode[] = [];
  private _spectrum: GlowSpectrum | null = null;
  private _state: Record<string, unknown> = {};
  private _photonEmissionRate: number = 0;
  private _fretEfficiency: number = 0;
  private _stoichiometry: number = 1;

  constructor(config: BioluminescenceConfig) {
    this._config = config;
  }

  get nodeCount(): number {
    return this._nodes.length;
  }

  get totalIntensity(): number {
    return this._nodes.reduce((acc, n) => acc + (n.active ? n.intensity : 0), 0);
  }

  get fretEfficiency(): number {
    return this._fretEfficiency;
  }

  private _planckDistribution(wavelength: number, temperature: number): number {
    const h = 6.626e-34;
    const c = 3e8;
    const k = 1.38e-23;
    const lambda = wavelength * 1e-9;
    return (2 * h * c * c) / (Math.pow(lambda, 5) * (Math.exp((h * c) / (lambda * k * temperature)) - 1));
  }

  private _computeFret(donor: LuminescentNode, acceptor: LuminescentNode): number {
    const r0 = 5e-9;
    const r = Math.abs(donor.wavelength - acceptor.wavelength) * 1e-9 + r0;
    return 1 / (1 + Math.pow(r / r0, 6));
  }

  addNode(id: string, intensity: number, wavelength: number): LuminescentNode {
    const node: LuminescentNode = { id, intensity, wavelength, active: true };
    this._nodes.push(node);
    if (this._nodes.length > 20) this._nodes.shift();
    if (this._nodes.length >= 2) {
      const donor = this._nodes[this._nodes.length - 2];
      const acceptor = this._nodes[this._nodes.length - 1];
      this._fretEfficiency = this._computeFret(donor, acceptor);
    }
    this._photonEmissionRate += intensity * this._config.quantumYield;
    return node;
  }

  pulse(nodeId: string, boost: number): boolean {
    const node = this._nodes.find((n) => n.id === nodeId);
    if (!node) return false;
    node.intensity = Math.min(1, node.intensity + boost);
    node.active = true;
    this._photonEmissionRate += boost * this._config.quantumYield;
    return true;
  }

  decay(dt: number): void {
    for (const node of this._nodes) {
      if (node.active) {
        node.intensity *= Math.exp(-this._config.decayRate * dt);
        if (node.intensity < 0.01) node.active = false;
      }
    }
    this._photonEmissionRate *= Math.exp(-this._config.decayRate * dt);
  }

  computeSpectrum(): GlowSpectrum {
    const active = this._nodes.filter((n) => n.active);
    const totalIntensity = active.reduce((acc, n) => acc + n.intensity, 0);
    const peak = active.length > 0
      ? active.reduce((best, n) => (n.intensity > best.intensity ? n : best)).wavelength
      : 0;
    const wavelengths = active.map((n) => n.wavelength);
    const bandwidth = wavelengths.length > 0 ? Math.max(...wavelengths) - Math.min(...wavelengths) : 0;
    this._spectrum = { peakWavelength: peak, totalIntensity, bandwidth };
    return this._spectrum;
  }

  isGlowing(): boolean {
    return this.totalIntensity > 0.01;
  }

  dominantWavelength(): number {
    const active = this._nodes.filter((n) => n.active);
    if (active.length === 0) return 0;
    return active.reduce((best, n) => (n.intensity > best.intensity ? n : best)).wavelength;
  }

  computeBlackbodyFit(temperature: number): number {
    let error = 0;
    for (const n of this._nodes) {
      const theoretical = this._planckDistribution(n.wavelength, temperature);
      error += Math.abs(n.intensity - theoretical * 1e13);
    }
    return error / Math.max(1, this._nodes.length);
  }

  reset(): void {
    this._nodes = [];
    this._spectrum = null;
    this._photonEmissionRate = 0;
    this._fretEfficiency = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      nodes: this._nodes.length,
      totalIntensity: this.totalIntensity.toFixed(3),
      spectrum: this._spectrum,
      state: this._state,
      fretEfficiency: this._fretEfficiency.toFixed(4),
      photonRate: this._photonEmissionRate.toFixed(2),
    };
  }
}
