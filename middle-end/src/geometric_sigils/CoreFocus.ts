import { Signal, DataPacket } from '../shared/types';

/**
 * ⊙ Core Focus — the circled dot.
 * Represents the focusing core, its radiation field, and target lock.
 * The core sits at an origin, radiates a field that decays with distance,
 * and can lock onto targets while nodes orbit around it.
 */

export interface CoreState {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  stability: number;
  locked: boolean;
}

export interface RadiationField {
  source: { x: number; y: number };
  strength: number;
  decay: number;
  reach: number;
  affectedNodes: string[];
}

export interface FocusLock {
  target: { x: number; y: number; id: string };
  lockStrength: number; // 0-1
  duration: number;
  drift: number;
  timestamp: number;
}

interface OrbitingNode {
  id: string;
  distance: number;
  speed: number;
  phase: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
}

interface CoreHistoryEntry {
  timestamp: number;
  intensity: number;
  stability: number;
  radius: number;
  locked: boolean;
  orbitingCount: number;
  drift: number;
}

const DEFAULT_RADIUS = 1.0;
const DEFAULT_INTENSITY = 0.5;
const DEFAULT_STABILITY = 1.0;
const DEFAULT_REACH = 5.0;
const DEFAULT_DECAY = 0.1;
const MAX_HISTORY = 200;
const SINGULARITY_EPS = 1e-3;

export class CoreFocus {
  private _core: CoreState;
  private _field: RadiationField;
  private _locks: Map<string, FocusLock> = new Map();
  private _orbitingNodes: Map<string, OrbitingNode> = new Map();
  private _history: CoreHistoryEntry[] = [];
  private _isLocked: boolean = false;
  private _counter = 0;
  private _origin: { x: number; y: number };
  private _maxHistory: number = MAX_HISTORY;
  private _intensityDecay: number = 0.01; // per-tick natural decay
  private _stabilityRecovery: number = 0.005; // per-tick recovery toward 1.0

  constructor(origin: { x: number; y: number } = { x: 0, y: 0 }) {
    this._origin = { x: origin.x, y: origin.y };
    this._core = {
      x: origin.x,
      y: origin.y,
      radius: DEFAULT_RADIUS,
      intensity: DEFAULT_INTENSITY,
      stability: DEFAULT_STABILITY,
      locked: false,
    };
    this._field = {
      source: { x: origin.x, y: origin.y },
      strength: 0,
      decay: DEFAULT_DECAY,
      reach: DEFAULT_REACH,
      affectedNodes: [],
    };
  }

  lockOn(target: { x: number; y: number; id: string }): FocusLock {
    const lockStrength = this._computeLockStrength(target);
    const lock: FocusLock = {
      target: { x: target.x, y: target.y, id: target.id },
      lockStrength,
      duration: 0,
      drift: this._distance(this._core, target),
      timestamp: Date.now(),
    };
    this._locks.set(target.id, lock);
    this._isLocked = lockStrength > 0.3;
    this._core.locked = this._isLocked;
    this._counter++;
    // A successful lock focuses the core, raising intensity slightly
    if (this._isLocked) {
      this._core.intensity = Math.min(1.5, this._core.intensity + lockStrength * 0.1);
    }
    this._recordHistory();
    return { ...lock, target: { ...lock.target } };
  }

  release(): void {
    this._locks.clear();
    this._isLocked = false;
    this._core.locked = false;
  }

  radiate(strength: number, decay: number): RadiationField {
    const safeStrength = Math.max(0, strength);
    const safeDecay = this._clamp(decay, 0, 1);
    // Reach is the distance at which field strength drops below a small epsilon
    const eps = 1e-3;
    const reach = safeDecay > 0
      ? Math.max(0.1, Math.log(safeStrength / eps) / safeDecay)
      : DEFAULT_REACH;
    this._field = {
      source: { x: this._core.x, y: this._core.y },
      strength: safeStrength,
      decay: safeDecay,
      reach: isFinite(reach) ? reach : DEFAULT_REACH,
      affectedNodes: [],
    };
    this._propagateField();
    return {
      ...this._field,
      source: { ...this._field.source },
      affectedNodes: [...this._field.affectedNodes],
    };
  }

  absorb(incoming: Signal): number {
    // High-entropy signals are harder to absorb; intensity governs capacity
    const entropyPenalty = Math.min(1, incoming.entropy / 4);
    const absorptionCoeff = this._core.intensity * (1 - entropyPenalty) * this._core.stability;
    const absorbed = incoming.magnitude * absorptionCoeff;
    // Absorption raises intensity but perturbs stability
    this._core.intensity = Math.min(1.5, this._core.intensity + absorbed * 0.05);
    this._core.stability = Math.max(0, this._core.stability - incoming.entropy * 0.01);
    // The field source shifts slightly toward the signal origin (gravitational pull)
    this._nudgeCoreToward(incoming.source, absorbed * 0.001);
    this._recordHistory();
    return absorbed;
  }

  orbit(node: { id: string; distance: number; speed: number }): void {
    const phase = Math.random() * Math.PI * 2;
    const orbit: OrbitingNode = {
      id: node.id,
      distance: Math.max(SINGULARITY_EPS, node.distance),
      speed: node.speed,
      phase,
      position: {
        x: this._core.x + node.distance * Math.cos(phase),
        y: this._core.y + node.distance * Math.sin(phase),
      },
      velocity: {
        x: -node.speed * node.distance * Math.sin(phase),
        y: node.speed * node.distance * Math.cos(phase),
      },
    };
    this._orbitingNodes.set(node.id, orbit);
  }

  tick(deltaTime: number): void {
    // Advance every orbiting node along its circular path
    for (const node of this._orbitingNodes.values()) {
      this._advanceOrbitNode(node, deltaTime);
    }
    // Natural decay of intensity and slow recovery of stability
    this._core.intensity = Math.max(0, this._core.intensity - this._intensityDecay * deltaTime);
    if (!this._isLocked) {
      this._core.stability = Math.min(
        DEFAULT_STABILITY,
        this._core.stability + this._stabilityRecovery * deltaTime
      );
    }
    // Decay locks based on drift; drop locks that have faded below threshold
    this._decayLocks(deltaTime);
    // Refresh the field's affected-node list against the new positions
    this._propagateField();
    this._recordHistory();
  }

  collapse(): { x: number; y: number } {
    // Collapse the core to a singularity at its current center
    const singularity = { x: this._core.x, y: this._core.y };
    this._core.radius = SINGULARITY_EPS;
    this._core.intensity = Math.min(2, this._core.intensity * 2);
    this._core.stability = DEFAULT_STABILITY;
    // Pull every orbiting node into the singularity
    for (const node of this._orbitingNodes.values()) {
      node.distance = SINGULARITY_EPS;
      node.speed = 0;
      node.phase = 0;
      node.position = { ...singularity };
      node.velocity = { x: 0, y: 0 };
    }
    this._field.strength = 0;
    this._field.reach = 0;
    this._field.affectedNodes = [];
    this._recordHistory();
    return singularity;
  }

  expand(newRadius: number): void {
    this._core.radius = Math.max(SINGULARITY_EPS, newRadius);
    // Intensity dilutes as the core spreads out
    const dilution = 1 / (1 + newRadius * 0.1);
    this._core.intensity = Math.max(0, this._core.intensity * dilution);
    // Push orbiting nodes outward proportionally so they stay outside the core
    for (const node of this._orbitingNodes.values()) {
      if (node.distance < this._core.radius * 1.5) {
        node.distance = this._core.radius * 1.5;
      }
    }
    this._recordHistory();
  }

  getFieldStrengthAt(point: { x: number; y: number }): number {
    const dist = this._distance(this._field.source, point);
    if (dist > this._field.reach) return 0;
    return this._field.strength * Math.exp(-this._field.decay * dist);
  }

  getOrbitingNodes(): { id: string; position: { x: number; y: number }; velocity: { x: number; y: number } }[] {
    return Array.from(this._orbitingNodes.values()).map(n => ({
      id: n.id,
      position: { x: n.position.x, y: n.position.y },
      velocity: { x: n.velocity.x, y: n.velocity.y },
    }));
  }

  detectCoreDrift(): number {
    return this._distance(this._core, this._origin);
  }

  recenter(): void {
    this._core.x = this._origin.x;
    this._core.y = this._origin.y;
    this._field.source = { x: this._origin.x, y: this._origin.y };
    // Re-place orbiting nodes around the recentered core, preserving phase & distance
    for (const node of this._orbitingNodes.values()) {
      node.position = {
        x: this._core.x + node.distance * Math.cos(node.phase),
        y: this._core.y + node.distance * Math.sin(node.phase),
      };
    }
    this._propagateField();
    this._recordHistory();
  }

  toPacket(): DataPacket {
    this._counter++;
    return {
      id: `corefocus-${Date.now().toString(36)}-${this._counter.toString(36)}`,
      payload: {
        core: { ...this._core },
        field: {
          source: { ...this._field.source },
          strength: this._field.strength,
          decay: this._field.decay,
          reach: this._field.reach,
          affectedNodes: [...this._field.affectedNodes],
        },
        locks: Array.from(this._locks.entries()).map(([id, l]) => ({
          id,
          target: { ...l.target },
          lockStrength: l.lockStrength,
          duration: l.duration,
          drift: l.drift,
          timestamp: l.timestamp,
        })),
        orbitingCount: this._orbitingNodes.size,
        drift: this.detectCoreDrift(),
        isLocked: this._isLocked,
      } as unknown,
      metadata: {
        createdAt: Date.now(),
        route: ['core-focus'],
        priority: this._isLocked ? 1 : 0,
        phase: 'core',
      },
    };
  }

  reset(): void {
    this._core = {
      x: this._origin.x,
      y: this._origin.y,
      radius: DEFAULT_RADIUS,
      intensity: DEFAULT_INTENSITY,
      stability: DEFAULT_STABILITY,
      locked: false,
    };
    this._field = {
      source: { x: this._origin.x, y: this._origin.y },
      strength: 0,
      decay: DEFAULT_DECAY,
      reach: DEFAULT_REACH,
      affectedNodes: [],
    };
    this._locks.clear();
    this._orbitingNodes.clear();
    this._history = [];
    this._isLocked = false;
    this._counter = 0;
  }

  // ---- private helpers ----

  private _clamp(v: number, min: number, max: number): number {
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  private _distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private _computeLockStrength(target: { x: number; y: number; id: string }): number {
    const dist = this._distance(this._core, target);
    const proximity = Math.max(0, 1 - dist / Math.max(SINGULARITY_EPS, this._field.reach));
    const intensityFactor = 0.5 + this._core.intensity * 0.5;
    return this._clamp(proximity * this._core.stability * intensityFactor, 0, 1);
  }

  private _advanceOrbitNode(node: OrbitingNode, deltaTime: number): void {
    node.phase += node.speed * deltaTime;
    const cos = Math.cos(node.phase);
    const sin = Math.sin(node.phase);
    const nx = this._core.x + node.distance * cos;
    const ny = this._core.y + node.distance * sin;
    const vx = -node.speed * node.distance * sin;
    const vy = node.speed * node.distance * cos;
    node.position = { x: nx, y: ny };
    node.velocity = { x: vx, y: vy };
  }

  private _propagateField(): void {
    const affected: string[] = [];
    for (const node of this._orbitingNodes.values()) {
      const strength = this.getFieldStrengthAt(node.position);
      if (strength > 0.05) affected.push(node.id);
    }
    this._field.affectedNodes = affected;
  }

  private _decayLocks(deltaTime: number): void {
    const stale: string[] = [];
    for (const [id, lock] of this._locks) {
      lock.duration += deltaTime;
      const dx = lock.target.x - this._core.x;
      const dy = lock.target.y - this._core.y;
      lock.drift = Math.sqrt(dx * dx + dy * dy);
      // Lock strength erodes with accumulated drift and time
      lock.lockStrength = Math.max(0, lock.lockStrength - lock.drift * 0.001 * deltaTime);
      if (lock.lockStrength < 0.05) stale.push(id);
    }
    for (const id of stale) this._locks.delete(id);
    // If every lock has faded, release the locked state
    if (this._locks.size === 0) {
      this._isLocked = false;
      this._core.locked = false;
    }
  }

  private _nudgeCoreToward(source: string, amount: number): void {
    // Best-effort: source strings are hashed to a unit direction so the core
    // drifts deterministically toward the "direction" of repeated absorptions.
    if (amount <= 0) return;
    const hash = this._hashToUnit(source);
    this._core.x += hash.x * amount;
    this._core.y += hash.y * amount;
    this._field.source = { x: this._core.x, y: this._core.y };
  }

  private _hashToUnit(s: string): { x: number; y: number } {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    const angle = (Math.abs(h) % 36000) / 36000 * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  private _recordHistory(): void {
    this._history.push({
      timestamp: Date.now(),
      intensity: this._core.intensity,
      stability: this._core.stability,
      radius: this._core.radius,
      locked: this._core.locked,
      orbitingCount: this._orbitingNodes.size,
      drift: this.detectCoreDrift(),
    });
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  get core(): CoreState {
    return { ...this._core };
  }

  get field(): RadiationField {
    return {
      source: { ...this._field.source },
      strength: this._field.strength,
      decay: this._field.decay,
      reach: this._field.reach,
      affectedNodes: [...this._field.affectedNodes],
    };
  }

  get locks(): FocusLock[] {
    return Array.from(this._locks.values()).map(l => ({ ...l, target: { ...l.target } }));
  }

  get isLocked(): boolean {
    return this._isLocked;
  }

  get history(): CoreHistoryEntry[] {
    return this._history.map(h => ({ ...h }));
  }
}
