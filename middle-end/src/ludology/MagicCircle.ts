import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface MagicCircleState {
  id: string;
  name: string;
  rules: string[];
  isActive: boolean;
  enteredAt: number | null;
  exitedAt: number | null;
  immersionLevel: number;
  boundaryStrength: number;
}

export interface PlayFrame {
  id: string;
  type: 'literal' | 'ludic' | 'social' | 'personal';
  frame: string;
  isActive: boolean;
  nestingLevel: number;
}

export interface CailloisMode {
  id: string;
  name: string;
  type: 'agon' | 'alea' | 'mimicry' | 'ilinx';
  intensity: number;
  description: string;
}

export class MagicCircle {
  private _circles: Map<string, MagicCircleState> = new Map();
  private _frames: Map<string, PlayFrame> = new Map();
  private _cailloisModes: Map<string, CailloisMode> = new Map();
  private _playStates: Map<string, { inPlay: boolean; circleId: string | null }> = new Map();
  private _history: string[] = [];
  private _activeCircleId: string | null = null;
  private _counter = 0;

  constructor() {
    this._initCailloisModes();
  }

  enterCircle(circleId: string): MagicCircleState | null {
    const circle = this._circles.get(circleId);
    if (!circle) return null;

    if (this._activeCircleId && this._activeCircleId !== circleId) {
      const prevCircle = this._circles.get(this._activeCircleId);
      if (prevCircle) {
        prevCircle.isActive = false;
        prevCircle.exitedAt = Date.now();
      }
    }

    circle.isActive = true;
    circle.enteredAt = Date.now();
    circle.exitedAt = null;
    circle.immersionLevel = Math.min(1, circle.immersionLevel + 0.2);
    this._activeCircleId = circleId;

    this._recordHistory(`enterCircle:${circle.name}`);
    return circle;
  }

  exitCircle(): MagicCircleState | null {
    if (!this._activeCircleId) return null;

    const circle = this._circles.get(this._activeCircleId);
    if (!circle) return null;

    circle.isActive = false;
    circle.exitedAt = Date.now();
    this._activeCircleId = null;

    this._recordHistory(`exitCircle:${circle.name}`);
    return circle;
  }

  defineRules(rules: string[]): MagicCircleState {
    const id = `circle-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const circle: MagicCircleState = {
      id,
      name: `Magic Circle ${id}`,
      rules,
      isActive: false,
      enteredAt: null,
      exitedAt: null,
      immersionLevel: 0.3,
      boundaryStrength: 0.5 + rules.length * 0.05,
    };
    this._circles.set(id, circle);
    this._recordHistory(`defineRules:${rules.length}rules`);
    return circle;
  }

  setPlayFrame(type: PlayFrame['type']): PlayFrame {
    const id = `frame-${(++this._counter).toString(36)}`;
    const frame: PlayFrame = {
      id,
      type,
      frame: `Play frame: ${type}`,
      isActive: true,
      nestingLevel: 0,
    };
    this._frames.set(id, frame);
    this._recordHistory(`setPlayFrame:${type}`);
    return frame;
  }

  cailloisMix(modes: Array<{ type: CailloisMode['type']; intensity: number }>): CailloisMode[] {
    const result: CailloisMode[] = [];

    for (const { type, intensity } of modes) {
      const existing = Array.from(this._cailloisModes.values()).find(m => m.type === type);
      if (existing) {
        existing.intensity = Math.min(1, existing.intensity + intensity * 0.5);
        result.push(existing);
      }
    }

    this._recordHistory(`cailloisMix:${modes.length}modes`);
    return result;
  }

  lusoryAttitude(goal: string, means: string): {
    goal: string;
    means: string;
    lusoryAttitude: number;
    gameAsDefined: boolean;
  } {
    const hasRules = this._circles.size > 0;
    const hasGoal = goal.length > 0;
    const hasMeans = means.length > 0;

    let lusoryAttitude = 0;
    if (hasRules) lusoryAttitude += 0.3;
    if (hasGoal) lusoryAttitude += 0.3;
    if (hasMeans) lusoryAttitude += 0.3;
    if (this._activeCircleId) lusoryAttitude += 0.1;

    this._recordHistory(`lusoryAttitude:${lusoryAttitude.toFixed(2)}`);
    return {
      goal,
      means,
      lusoryAttitude,
      gameAsDefined: lusoryAttitude >= 0.7,
    };
  }

  calculateImmersionLevel(): number {
    if (!this._activeCircleId) return 0;

    const circle = this._circles.get(this._activeCircleId);
    if (!circle) return 0;

    let immersion = circle.immersionLevel;

    const activeFrames = Array.from(this._frames.values()).filter(f => f.isActive);
    immersion += activeFrames.length * 0.05;

    const activeModes = Array.from(this._cailloisModes.values()).filter(m => m.intensity > 0.3);
    immersion += activeModes.length * 0.05;

    return Math.min(1, immersion);
  }

  calculateBoundaryPorousness(): number {
    if (!this._activeCircleId) return 1;

    const circle = this._circles.get(this._activeCircleId);
    if (!circle) return 1;

    const porousness = 1 - circle.boundaryStrength;

    const activeFrames = Array.from(this._frames.values()).filter(f => f.isActive).length;
    const framePorousness = Math.min(1, activeFrames * 0.1);

    return Math.min(1, Math.max(0, porousness + framePorousness * 0.3));
  }

  getActiveCircle(): MagicCircleState | null {
    if (!this._activeCircleId) return null;
    return this._circles.get(this._activeCircleId) || null;
  }

  toPacket(): DataPacket {
    return {
      id: `magic-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        circles: Array.from(this._circles.values()),
        frames: Array.from(this._frames.values()),
        cailloisModes: Array.from(this._cailloisModes.values()),
        activeCircle: this.getActiveCircle(),
        immersionLevel: this.calculateImmersionLevel(),
        boundaryPorousness: this.calculateBoundaryPorousness(),
        totalCircles: this._circles.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ludology', 'MagicCircle'],
        priority: Math.max(1, Math.floor(this.calculateImmersionLevel() * 10)),
        phase: 'playing',
      },
    };
  }

  reset(): void {
    this._circles.clear();
    this._frames.clear();
    this._cailloisModes.clear();
    this._playStates.clear();
    this._history = [];
    this._activeCircleId = null;
    this._counter = 0;
    this._initCailloisModes();
  }

  get circleCount(): number {
    return this._circles.size;
  }

  get activeCircle(): MagicCircleState | null {
    return this.getActiveCircle();
  }

  get history(): string[] {
    return [...this._history];
  }

  playDuration(): number {
    const active = this.getActiveCircle();
    if (!active || !active.enteredAt) return 0;
    return Date.now() - active.enteredAt;
  }

  dominantCailloisMode(): CailloisMode | null {
    let dominant: CailloisMode | null = null;
    let maxIntensity = -1;

    for (const mode of this._cailloisModes.values()) {
      if (mode.intensity > maxIntensity) {
        maxIntensity = mode.intensity;
        dominant = mode;
      }
    }

    return dominant;
  }

  cailloisBalance(): {
    agon: number;
    alea: number;
    mimicry: number;
    ilinx: number;
    balance: number;
  } {
    const intensities: Record<string, number> = {
      agon: 0,
      alea: 0,
      mimicry: 0,
      ilinx: 0,
    };

    for (const mode of this._cailloisModes.values()) {
      intensities[mode.type] = mode.intensity;
    }

    const values = Object.values(intensities);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
    const balance = 1 - Math.min(1, Math.sqrt(variance));

    return {
      agon: intensities.agon,
      alea: intensities.alea,
      mimicry: intensities.mimicry,
      ilinx: intensities.ilinx,
      balance,
    };
  }

  frameStacking(): {
    depth: number;
    frames: PlayFrame[];
  } {
    const activeFrames = Array.from(this._frames.values()).filter(f => f.isActive);
    return {
      depth: activeFrames.length,
      frames: activeFrames,
    };
  }

  breakingTheMagic(): {
    risk: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let risk = 0;

    if (this.calculateBoundaryPorousness() > 0.6) {
      factors.push('porous boundaries');
      risk += 0.3;
    }

    if (this.calculateImmersionLevel() < 0.4) {
      factors.push('low immersion');
      risk += 0.3;
    }

    const activeFrames = Array.from(this._frames.values()).filter(f => f.isActive).length;
    if (activeFrames === 0) {
      factors.push('no active play frame');
      risk += 0.2;
    }

    const active = this.getActiveCircle();
    if (!active) {
      factors.push('no active circle');
      risk += 0.2;
    }

    return {
      risk: Math.min(1, risk),
      factors,
    };
  }

  strengthenBoundary(): MagicCircleState | null {
    const active = this.getActiveCircle();
    if (!active) return null;

    active.boundaryStrength = Math.min(1, active.boundaryStrength + 0.1);
    this._recordHistory('strengthenBoundary');
    return active;
  }

  weakenBoundary(): MagicCircleState | null {
    const active = this.getActiveCircle();
    if (!active) return null;

    active.boundaryStrength = Math.max(0, active.boundaryStrength - 0.1);
    this._recordHistory('weakenBoundary');
    return active;
  }

  deepPlay(): {
    depth: number;
    dimensions: string[];
  } {
    const dimensions: string[] = [];
    let depth = 0;

    if (this.calculateImmersionLevel() > 0.7) {
      dimensions.push('high immersion');
      depth += 0.25;
    }

    const caillois = this.cailloisBalance();
    if (caillois.balance > 0.5) {
      dimensions.push('balanced play modes');
      depth += 0.25;
    }

    const active = this.getActiveCircle();
    if (active && active.rules.length > 3) {
      dimensions.push('rich rule set');
      depth += 0.25;
    }

    if (this.frameStacking().depth > 1) {
      dimensions.push('nested frames');
      depth += 0.25;
    }

    return {
      depth: Math.min(1, depth),
      dimensions,
    };
  }

  private _initCailloisModes(): void {
    const modes: Array<{ name: string; type: CailloisMode['type']; description: string }> = [
      { name: 'Agon', type: 'agon', description: 'Competition, striving to win' },
      { name: 'Alea', type: 'alea', description: 'Chance, randomness, luck' },
      { name: 'Mimicry', type: 'mimicry', description: 'Role-playing, imitation, make-believe' },
      { name: 'Ilinx', type: 'ilinx', description: 'Vertigo, ecstasy, loss of self' },
    ];

    for (const mode of modes) {
      const id = `caillois-${mode.type}`;
      this._cailloisModes.set(id, {
        id,
        name: mode.name,
        type: mode.type,
        intensity: 0.3,
        description: mode.description,
      });
    }
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
