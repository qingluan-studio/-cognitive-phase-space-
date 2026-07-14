export interface ArchetypeInstance {
  id: string;
  archetype: string;
  frequency: number;
  projectionAngle: number;
  resonance: number;
  shadowDepth: number;
}

export interface ShadowResonance {
  archetype: string;
  mode: number;
  amplitude: number;
  phase: number;
}

export class ArchetypalShadow {
  private _instances: Map<string, ArchetypeInstance> = new Map();
  private _frequencies: Map<string, number> = new Map();
  private _state: Record<string, unknown> = {};
  private _resonanceModes: ShadowResonance[] = [];
  private _projectionMatrix: number[][] = [];

  constructor() {}

  get instanceCount(): number {
    return this._instances.size;
  }

  get archetypeCount(): number {
    return this._frequencies.size;
  }

  manifest(id: string, archetype: string, projectionAngle: number, shadowDepth: number): ArchetypeInstance {
    const frequency = (this._frequencies.get(archetype) ?? 0) + 1;
    this._frequencies.set(archetype, frequency);
    const resonance = Math.sin(projectionAngle) * shadowDepth;
    const instance: ArchetypeInstance = { id, archetype, frequency, projectionAngle, resonance, shadowDepth };
    this._instances.set(id, instance);
    this._updateResonanceModes();
    this._updateProjectionMatrix();
    return instance;
  }

  private _updateResonanceModes(): void {
    this._resonanceModes = [];
    for (const [archetype, freq] of this._frequencies) {
      const instances = Array.from(this._instances.values()).filter((i) => i.archetype === archetype);
      const avgResonance = instances.reduce((s, i) => s + i.resonance, 0) / (instances.length || 1);
      this._resonanceModes.push({
        archetype,
        mode: freq,
        amplitude: avgResonance,
        phase: Math.atan2(avgResonance, freq),
      });
    }
  }

  private _updateProjectionMatrix(): void {
    const n = this._instances.size;
    this._projectionMatrix = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const a = Array.from(this._instances.values())[i];
        const b = Array.from(this._instances.values())[j];
        return Math.cos(a.projectionAngle - b.projectionAngle);
      })
    );
  }

  project(instanceId: string, targetAngle: number): number {
    const instance = this._instances.get(instanceId);
    if (!instance) return 0;
    return instance.shadowDepth * Math.cos(instance.projectionAngle - targetAngle);
  }

  amplify(archetype: string, factor: number): void {
    for (const instance of this._instances.values()) {
      if (instance.archetype === archetype) {
        instance.shadowDepth = Math.min(1, instance.shadowDepth * factor);
        instance.resonance = Math.sin(instance.projectionAngle) * instance.shadowDepth;
      }
    }
    this._updateResonanceModes();
  }

  suppress(archetype: string): void {
    for (const instance of this._instances.values()) {
      if (instance.archetype === archetype) {
        instance.shadowDepth *= 0.5;
        instance.resonance = Math.sin(instance.projectionAngle) * instance.shadowDepth;
      }
    }
    this._updateResonanceModes();
  }

  archetypeEntropy(): number {
    const total = Array.from(this._frequencies.values()).reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -Array.from(this._frequencies.values()).reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  strongestArchetype(): string | null {
    if (this._frequencies.size === 0) return null;
    let best = '';
    let maxFreq = 0;
    for (const [a, f] of this._frequencies) {
      if (f > maxFreq) {
        maxFreq = f;
        best = a;
      }
    }
    return best;
  }

  eigenvalueSpectrum(): number[] {
    const n = this._projectionMatrix.length;
    if (n === 0) return [];
    let vec = Array(n).fill(1 / n);
    for (let iter = 0; iter < 20; iter++) {
      const next = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          next[i] += this._projectionMatrix[i][j] * vec[j];
        }
      }
      const norm = Math.sqrt(next.reduce((s, v) => s + v * v, 0));
      vec = next.map((v) => v / (norm || 1));
    }
    return vec;
  }

  report(): Record<string, unknown> {
    return {
      instances: this._instances.size,
      archetypes: this._frequencies.size,
      entropy: this.archetypeEntropy(),
      strongest: this.strongestArchetype(),
      resonanceModes: this._resonanceModes.length,
      state: this._state,
    };
  }
}
