export interface SingularityData {
  readonly singularityId: string;
  x: number;
  y: number;
  strength: number;
  range: number;
}

export interface AgentState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  safe: boolean;
}

export class SingularityAvoid {
  private _singularities: Map<string, SingularityData> = new Map();
  private _agents: Map<string, AgentState> = new Map();
  private _state: Record<string, unknown> = {};
  private _lyapunov: number = 0;
  private _barrierCertificate: number = 0;

  constructor() {}

  get singularityCount(): number {
    return this._singularities.size;
  }

  get agentCount(): number {
    return this._agents.size;
  }

  addSingularity(data: SingularityData): void {
    this._singularities.set(data.singularityId, { ...data });
  }

  registerAgent(id: string, x: number, y: number, vx: number, vy: number): void {
    this._agents.set(id, { id, x, y, vx, vy, safe: true });
  }

  computeRepulsion(agentId: string): { fx: number; fy: number; potential: number } {
    const agent = this._agents.get(agentId);
    if (!agent) return { fx: 0, fy: 0, potential: 0 };
    let fx = 0;
    let fy = 0;
    let potential = 0;
    for (const s of this._singularities.values()) {
      const dx = agent.x - s.x;
      const dy = agent.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0 || dist > s.range) continue;
      const force = s.strength / (dist * dist);
      const norm = dist;
      fx += (dx / norm) * force;
      fy += (dy / norm) * force;
      potential += s.strength / dist;
    }
    return { fx, fy, potential };
  }

  stepAgent(agentId: string, dt: number): void {
    const agent = this._agents.get(agentId);
    if (!agent) return;
    const { fx, fy, potential } = this.computeRepulsion(agentId);
    agent.vx += fx * dt;
    agent.vy += fy * dt;
    agent.x += agent.vx * dt;
    agent.y += agent.vy * dt;
    agent.safe = potential < 10;
    this._lyapunov = potential;
    this._barrierCertificate = Math.min(0, distToNearest(agent, this._singularities));
  }

  isSafe(agentId: string): boolean {
    return this._agents.get(agentId)?.safe ?? false;
  }

  gradientDescentStep(agentId: string, stepSize: number): { x: number; y: number } {
    const agent = this._agents.get(agentId);
    if (!agent) return { x: 0, y: 0 };
    const { fx, fy } = this.computeRepulsion(agentId);
    agent.x += fx * stepSize;
    agent.y += fy * stepSize;
    return { x: agent.x, y: agent.y };
  }

  lyapunovValue(): number {
    return this._lyapunov;
  }

  barrierCertificate(): number {
    return this._barrierCertificate;
  }

  safetyMargin(agentId: string): number {
    const agent = this._agents.get(agentId);
    if (!agent) return 0;
    let minDist = Infinity;
    for (const s of this._singularities.values()) {
      const d = Math.sqrt((agent.x - s.x) ** 2 + (agent.y - s.y) ** 2);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  report(): Record<string, unknown> {
    return {
      singularities: this._singularities.size,
      agents: this._agents.size,
      lyapunov: this._lyapunov,
      barrier: this._barrierCertificate,
      state: this._state,
    };
  }
}

function distToNearest(agent: AgentState, singularities: Map<string, SingularityData>): number {
  let min = Infinity;
  for (const s of singularities.values()) {
    const d = Math.sqrt((agent.x - s.x) ** 2 + (agent.y - s.y) ** 2);
    if (d < min) min = d;
  }
  return min;
}
