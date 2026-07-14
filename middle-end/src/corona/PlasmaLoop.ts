/**
 * 等离子体环模块：磁通量管中循环流动的物质环。
 * 用于刻画系统中沿闭合磁力线循环的物质流。
 */

export interface PlasmaLoopSegment {
  angle: number;
  density: number;
  velocity: number;
  magneticField: number;
}

export type LoopFlow = {
  segments: number;
  totalFlow: number;
  peakVelocity: number;
  circumference: number;
};

export interface PlasmaLoopConfig {
  segmentCount: number;
  radius: number;
  baseField: number;
}

export class PlasmaLoop {
  private _config: PlasmaLoopConfig;
  private _segments: PlasmaLoopSegment[] = [];
  private _flow: LoopFlow | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: PlasmaLoopConfig) {
    this._config = config;
    this._build();
  }

  get segmentCount(): number {
    return this._segments.length;
  }

  get circumference(): number {
    return 2 * Math.PI * this._config.radius;
  }

  private _build(): void {
    this._segments = [];
    const n = this._config.segmentCount;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI;
      const density = 1 + 0.5 * Math.sin(angle * 2);
      const velocity = this._config.baseField * Math.cos(angle);
      const magneticField = this._config.baseField * (1 + 0.3 * Math.sin(angle));
      this._segments.push({ angle, density, velocity, magneticField });
    }
  }

  computeFlow(): LoopFlow {
    const totalFlow = this._segments.reduce((acc, s) => acc + s.density * s.velocity, 0);
    const peakVelocity =
      this._segments.length > 0 ? Math.max(...this._segments.map((s) => Math.abs(s.velocity))) : 0;
    this._flow = {
      segments: this._segments.length,
      totalFlow,
      peakVelocity,
      circumference: this.circumference,
    };
    return this._flow;
  }

  densityAt(angle: number): number {
    return 1 + 0.5 * Math.sin(angle * 2);
  }

  velocityAt(angle: number): number {
    return this._config.baseField * Math.cos(angle);
  }

  isFlowing(): boolean {
    return Math.abs(this.computeFlow().totalFlow) > 0.1;
  }

  peakSegment(): PlasmaLoopSegment | null {
    if (this._segments.length === 0) return null;
    return this._segments.reduce((best, s) =>
      Math.abs(s.velocity) > Math.abs(best.velocity) ? s : best
    );
  }

  averageField(): number {
    if (this._segments.length === 0) return 0;
    return this._segments.reduce((acc, s) => acc + s.magneticField, 0) / this._segments.length;
  }

  setField(field: number): void {
    this._config.baseField = field;
    this._build();
    this._state.fieldUpdated = field;
  }

  report(): Record<string, unknown> {
    return {
      segmentCount: this._segments.length,
      flow: this._flow,
      state: this._state,
    };
  }
}
