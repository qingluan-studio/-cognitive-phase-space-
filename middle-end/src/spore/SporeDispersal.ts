export interface DispersalKernel {
  distance: number;
  probability: number;
  density: number;
  colonizationProb: number;
}

export interface DispersalEvent {
  sporeId: string;
  originX: number;
  originY: number;
  landingX: number;
  landingY: number;
  distance: number;
  survived: boolean;
}

export class SporeDispersal {
  private _events: DispersalEvent[] = [];
  private _state: Record<string, unknown> = {};
  private _alpha: number = 1.5;
  private _islandDistance: number = 10;
  private _colonizationHistory: Map<string, number> = new Map();

  constructor() {}

  get eventCount(): number {
    return this._events.length;
  }

  setLevyAlpha(alpha: number): void {
    this._alpha = Math.max(1.1, Math.min(2, alpha));
  }

  sampleLevyStep(): number {
    const u = Math.random();
    const v = Math.random();
    const step = Math.pow(Math.abs(u - 0.5) / Math.pow(Math.abs(v), 1 / this._alpha), 1 / this._alpha);
    return Math.min(step, 50);
  }

  disperse(sporeId: string, originX: number, originY: number): DispersalEvent {
    const step = this.sampleLevyStep();
    const angle = Math.random() * Math.PI * 2;
    const landingX = originX + step * Math.cos(angle);
    const landingY = originY + step * Math.sin(angle);
    const distance = Math.sqrt(Math.pow(landingX - originX, 2) + Math.pow(landingY - originY, 2));
    const survivalProb = Math.exp(-distance / 10);
    const survived = Math.random() < survivalProb;
    const event: DispersalEvent = { sporeId, originX, originY, landingX, landingY, distance, survived };
    this._events.push(event);
    if (this._events.length > 200) this._events.shift();
    if (survived) {
      this._colonizationHistory.set(sporeId, (this._colonizationHistory.get(sporeId) ?? 0) + 1);
    }
    return event;
  }

  kernelDensityEstimate(bandwidth: number): DispersalKernel[] {
    const kernels: DispersalKernel[] = [];
    const maxDist = Math.max(...this._events.map((e) => e.distance), 1);
    for (let d = 0; d <= maxDist; d += 1) {
      let density = 0;
      for (const event of this._events) {
        const k = Math.exp(-Math.pow(event.distance - d, 2) / (2 * bandwidth * bandwidth));
        density += k;
      }
      const probability = density / (this._events.length * bandwidth * Math.sqrt(2 * Math.PI));
      const colonizationProb = this._events.filter((e) => e.distance >= d - 1 && e.distance < d + 1 && e.survived).length / (this._events.filter((e) => e.distance >= d - 1 && e.distance < d + 1).length || 1);
      kernels.push({ distance: d, probability, density, colonizationProb });
    }
    return kernels;
  }

  islandBiogeography(islandArea: number, distanceToMainland: number): { immigration: number; extinction: number; equilibrium: number } {
    const immigrationRate = Math.exp(-distanceToMainland / this._islandDistance) * islandArea;
    const extinctionRate = 1 / islandArea;
    const equilibrium = immigrationRate / (immigrationRate + extinctionRate);
    return { immigration: immigrationRate, extinction: extinctionRate, equilibrium };
  }

  meanDispersalDistance(): number {
    if (this._events.length === 0) return 0;
    return this._events.reduce((s, e) => s + e.distance, 0) / this._events.length;
  }

  colonizationRate(): number {
    if (this._events.length === 0) return 0;
    return this._events.filter((e) => e.survived).length / this._events.length;
  }

  dispersalKernelEntropy(): number {
    const distances = this._events.map((e) => e.distance);
    const total = distances.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -distances.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  colonizationSuccessCurve(): { distance: number; success: number }[] {
    const curve: { distance: number; success: number }[] = [];
    const maxDist = Math.max(...this._events.map((e) => e.distance), 1);
    for (let d = 0; d <= maxDist; d += 1) {
      const events = this._events.filter((e) => Math.abs(e.distance - d) < 1);
      const success = events.length > 0 ? events.filter((e) => e.survived).length / events.length : 0;
      curve.push({ distance: d, success });
    }
    return curve;
  }

  report(): Record<string, unknown> {
    return {
      events: this._events.length,
      meanDistance: this.meanDispersalDistance(),
      colonizationRate: this.colonizationRate(),
      colonizedIslands: this._colonizationHistory.size,
      state: this._state,
    };
  }
}
