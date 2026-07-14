export interface EscapeOrbit {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  velocity: number;
}

export interface EscapeBody {
  id: string;
  mass: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
}

export class EscapeVelocity {
  private _bodies: Map<string, EscapeBody> = new Map();
  private _orbits: Map<string, EscapeOrbit> = new Map();
  private _gravitationalConstant: number = 6.67430e-11;
  private _state: Record<string, unknown> = {};
  private _hillSphereCache: Map<string, number> = new Map();

  constructor() {}

  get bodyCount(): number {
    return this._bodies.size;
  }

  registerBody(id: string, mass: number, x: number, y: number, vx: number, vy: number): void {
    this._bodies.set(id, { id, mass, position: { x, y }, velocity: { x: vx, y: vy } });
    this._computeOrbit(id);
    this._computeHillSphere(id);
  }

  private _computeOrbit(id: string): void {
    const body = this._bodies.get(id);
    if (!body) return;
    const r = Math.sqrt(body.position.x ** 2 + body.position.y ** 2);
    const v = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
    const mu = this._gravitationalConstant * body.mass * 1e15;
    const specificEnergy = v * v / 2 - mu / r;
    const semiMajorAxis = -mu / (2 * specificEnergy);
    const h = r * v;
    const eccentricity = Math.sqrt(1 + (2 * specificEnergy * h * h) / (mu * mu));
    this._orbits.set(id, { semiMajorAxis, eccentricity, inclination: 0, velocity: v });
  }

  private _computeHillSphere(id: string): void {
    const body = this._bodies.get(id);
    if (!body) return;
    const primary = Array.from(this._bodies.values()).find((b) => b.mass > body.mass * 10);
    if (!primary) return;
    const a = Math.sqrt(
      Math.pow(body.position.x - primary.position.x, 2) + Math.pow(body.position.y - primary.position.y, 2)
    );
    const e = this._orbits.get(id)?.eccentricity ?? 0;
    const hill = a * (1 - e) * Math.pow(body.mass / (3 * primary.mass), 1 / 3);
    this._hillSphereCache.set(id, hill);
  }

  escapeVelocity(bodyId: string): number {
    const body = this._bodies.get(bodyId);
    if (!body) return Infinity;
    const r = Math.sqrt(body.position.x ** 2 + body.position.y ** 2);
    const mu = this._gravitationalConstant * body.mass * 1e15;
    return Math.sqrt((2 * mu) / r);
  }

  visViva(bodyId: string): number {
    const body = this._bodies.get(bodyId);
    const orbit = this._orbits.get(bodyId);
    if (!body || !orbit) return 0;
    const r = Math.sqrt(body.position.x ** 2 + body.position.y ** 2);
    const mu = this._gravitationalConstant * body.mass * 1e15;
    return Math.sqrt(mu * (2 / r - 1 / orbit.semiMajorAxis));
  }

  isEscaping(bodyId: string): boolean {
    const body = this._bodies.get(bodyId);
    if (!body) return false;
    const v = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
    return v >= this.escapeVelocity(bodyId);
  }

  jacobiIntegral(bodyId: string, primaryId: string): number {
    const body = this._bodies.get(bodyId);
    const primary = this._bodies.get(primaryId);
    if (!body || !primary) return 0;
    const r = Math.sqrt(body.position.x ** 2 + body.position.y ** 2);
    const r2 = Math.sqrt(
      Math.pow(body.position.x - primary.position.x, 2) + Math.pow(body.position.y - primary.position.y, 2)
    );
    const v2 = body.velocity.x ** 2 + body.velocity.y ** 2;
    const omega = Math.sqrt(this._gravitationalConstant * primary.mass * 1e15 / Math.pow(r2, 3));
    return v2 / 2 - this._gravitationalConstant * primary.mass * 1e15 / r2 - 0.5 * omega * omega * r * r;
  }

  nBodyPerturbation(bodyId: string, dt: number): { dx: number; dy: number; dvx: number; dvy: number } {
    const body = this._bodies.get(bodyId);
    if (!body) return { dx: 0, dy: 0, dvx: 0, dvy: 0 };
    let ax = 0;
    let ay = 0;
    for (const other of this._bodies.values()) {
      if (other.id === bodyId) continue;
      const dx = other.position.x - body.position.x;
      const dy = other.position.y - body.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const a = (this._gravitationalConstant * other.mass * 1e15) / (dist * dist * dist);
      ax += a * dx;
      ay += a * dy;
    }
    return {
      dx: body.velocity.x * dt,
      dy: body.velocity.y * dt,
      dvx: ax * dt,
      dvy: ay * dt,
    };
  }

  hillSphere(bodyId: string): number {
    return this._hillSphereCache.get(bodyId) ?? 0;
  }

  report(): Record<string, unknown> {
    const orbits = Array.from(this._orbits.entries()).map(([id, o]) => ({ id, ...o }));
    return {
      bodies: this._bodies.size,
      orbits,
      state: this._state,
    };
  }
}
