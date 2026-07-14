/**
 * NonLocalEffect - 非局域效应
 * 无视空间距离的效果传递，效果强度不随距离衰减，
 * 挑战经典物理的局域性原理。
 */

export interface NonLocalEffectData {
  readonly effectId: string;
  effectType: string;
  intensity: number;
  affectedNodes: string[];
}

export interface EffectApplication {
  nodeId: string;
  receivedIntensity: number;
  timestamp: number;
  acknowledged: boolean;
}

export class NonLocalEffect {
  private _data: NonLocalEffectData;
  private _applications: EffectApplication[] = [];
  private _acknowledgedNodes: Set<string> = new Set();
  private _interferencePattern: number = 0;
  private _synchronized: boolean = false;

  constructor(data: NonLocalEffectData) {
    this._data = { ...data, affectedNodes: [...data.affectedNodes] };
  }

  get effectId(): string {
    return this._data.effectId;
  }

  get intensity(): number {
    return this._data.intensity;
  }

  get affectedCount(): number {
    return this._data.affectedNodes.length;
  }

  public applyEffect(nodeId: string, timestamp: number): EffectApplication | null {
    if (!this._data.affectedNodes.includes(nodeId)) {
      return null;
    }
    const received = this._data.intensity;
    const acknowledged = Math.random() < 0.9;
    const application: EffectApplication = {
      nodeId,
      receivedIntensity: received,
      timestamp,
      acknowledged,
    };
    this._applications.push(application);
    if (acknowledged) {
      this._acknowledgedNodes.add(nodeId);
    }
    if (this._applications.length > 50) {
      this._applications.shift();
    }
    this._updateInterference();
    return application;
  }

  private _updateInterference(): void {
    const ackRate = this._acknowledgedNodes.size / this._data.affectedNodes.length;
    this._interferencePattern = ackRate;
    this._synchronized = ackRate > 0.8;
  }

  public addNode(nodeId: string): void {
    if (!this._data.affectedNodes.includes(nodeId)) {
      this._data.affectedNodes.push(nodeId);
    }
  }

  public removeNode(nodeId: string): void {
    const idx = this._data.affectedNodes.indexOf(nodeId);
    if (idx >= 0) {
      this._data.affectedNodes.splice(idx, 1);
    }
    this._acknowledgedNodes.delete(nodeId);
  }

  public setIntensity(intensity: number): void {
    this._data.intensity = Math.max(0, intensity);
  }

  public broadcastEffect(timestamp: number): number {
    let count = 0;
    this._data.affectedNodes.forEach((node) => {
      const result = this.applyEffect(node, timestamp);
      if (result?.acknowledged) {
        count++;
      }
    });
    return count;
  }

  public amplify(factor: number): void {
    this._data.intensity *= factor;
  }

  public measureCoherence(): number {
    if (this._applications.length === 0) {
      return 0;
    }
    const intensities = this._applications.map((a) => a.receivedIntensity);
    const mean = intensities.reduce((s, i) => s + i, 0) / intensities.length;
    const variance = intensities.reduce((s, i) => s + (i - mean) ** 2, 0) / intensities.length;
    return 1 - Math.min(1, variance);
  }

  public effectReport(): Record<string, unknown> {
    return {
      effectId: this.effectId,
      effectType: this._data.effectType,
      intensity: this._data.intensity.toFixed(3),
      affectedCount: this.affectedCount,
      acknowledgedCount: this._acknowledgedNodes.size,
      interferencePattern: this._interferencePattern.toFixed(3),
      synchronized: this._synchronized,
      applicationCount: this._applications.length,
      coherence: this.measureCoherence().toFixed(3),
    };
  }
}
