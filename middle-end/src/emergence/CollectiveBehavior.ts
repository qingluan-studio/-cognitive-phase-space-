export interface AgentState {
  x: number;
  y: number;
  theta: number;
  speed: number;
  neighborCount: number;
}

export interface OrderParameter {
  step: number;
  polarization: number;
  angularMomentum: number;
  rotation: number;
}

export class CollectiveBehavior {
  private _agents: AgentState[];
  private _count: number;
  private _interactionRadius: number;
  private _noise: number;
  private _speed: number;
  private _width: number;
  private _height: number;
  private _history: OrderParameter[];
  private _currentStep: number;

  constructor(count: number, width: number, height: number, speed: number = 1.0, radius: number = 5.0, noise: number = 0.1) {
    this._count = count;
    this._width = width;
    this._height = height;
    this._speed = speed;
    this._interactionRadius = radius;
    this._noise = noise;
    this._agents = [];
    this._history = [];
    this._currentStep = 0;
    for (let i = 0; i < count; i++) {
      this._agents.push({
        x: Math.random() * width,
        y: Math.random() * height,
        theta: Math.random() * 2 * Math.PI,
        speed,
        neighborCount: 0
      });
    }
  }

  get count(): number { return this._count; }
  get interactionRadius(): number { return this._interactionRadius; }
  get noise(): number { return this._noise; }
  get currentStep(): number { return this._currentStep; }
  get history(): OrderParameter[] { return this._history; }

  public setNoise(n: number): void {
    this._noise = n;
  }

  public setSpeed(s: number): void {
    this._speed = s;
    for (const a of this._agents) a.speed = s;
  }

  public setInteractionRadius(r: number): void {
    this._interactionRadius = r;
  }

  private _getNeighbors(idx: number): number[] {
    const neighbors: number[] = [];
    const a = this._agents[idx];
    for (let i = 0; i < this._count; i++) {
      if (i === idx) continue;
      const b = this._agents[i];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      if (this._toroidal) {
        dx = ((dx + this._width / 2) % this._width) - this._width / 2;
        dy = ((dy + this._height / 2) % this._height) - this._height / 2;
      }
      if (Math.sqrt(dx * dx + dy * dy) < this._interactionRadius) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  private get _toroidal(): boolean { return true; }

  public step(): void {
    const newAgents: AgentState[] = [];
    for (let i = 0; i < this._count; i++) {
      const neighbors = this._getNeighbors(i);
      const a = this._agents[i];
      let avgSin = Math.sin(a.theta);
      let avgCos = Math.cos(a.theta);
      for (const j of neighbors) {
        avgSin += Math.sin(this._agents[j].theta);
        avgCos += Math.cos(this._agents[j].theta);
      }
      const n = neighbors.length + 1;
      avgSin /= n;
      avgCos /= n;
      let newTheta = Math.atan2(avgSin, avgCos) + (Math.random() - 0.5) * 2 * this._noise;
      let newX = a.x + this._speed * Math.cos(newTheta);
      let newY = a.y + this._speed * Math.sin(newTheta);
      if (this._toroidal) {
        newX = (newX + this._width) % this._width;
        newY = (newY + this._height) % this._height;
      } else {
        if (newX < 0 || newX > this._width) newTheta = Math.PI - newTheta;
        if (newY < 0 || newY > this._height) newTheta = -newTheta;
        newX = Math.max(0, Math.min(this._width, newX));
        newY = Math.max(0, Math.min(this._height, newY));
      }
      newAgents.push({
        x: newX,
        y: newY,
        theta: newTheta,
        speed: this._speed,
        neighborCount: neighbors.length
      });
    }
    this._agents = newAgents;
    this._currentStep++;
    this._recordOrder();
  }

  public run(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.step();
    }
  }

  public computePolarization(): number {
    let sumSin = 0;
    let sumCos = 0;
    for (const a of this._agents) {
      sumSin += Math.sin(a.theta);
      sumCos += Math.cos(a.theta);
    }
    return Math.sqrt(sumSin ** 2 + sumCos ** 2) / this._count;
  }

  public computeAngularMomentum(): number {
    const cx = this._agents.reduce((sum, a) => sum + a.x, 0) / this._count;
    const cy = this._agents.reduce((sum, a) => sum + a.y, 0) / this._count;
    let l = 0;
    for (const a of this._agents) {
      const rx = a.x - cx;
      const ry = a.y - cy;
      const vx = a.speed * Math.cos(a.theta);
      const vy = a.speed * Math.sin(a.theta);
      l += rx * vy - ry * vx;
    }
    return Math.abs(l) / this._count;
  }

  public computeRotation(): number {
    const cx = this._agents.reduce((sum, a) => sum + a.x, 0) / this._count;
    const cy = this._agents.reduce((sum, a) => sum + a.y, 0) / this._count;
    let sumCross = 0;
    let sumDist = 0;
    for (const a of this._agents) {
      const rx = a.x - cx;
      const ry = a.y - cy;
      const vx = Math.cos(a.theta);
      const vy = Math.sin(a.theta);
      sumCross += rx * vy - ry * vx;
      sumDist += Math.sqrt(rx * rx + ry * ry);
    }
    return sumDist > 0 ? sumCross / sumDist : 0;
  }

  public computeMeanNeighborCount(): number {
    return this._agents.reduce((sum, a) => sum + a.neighborCount, 0) / this._count;
  }

  public computeClusterCount(): number {
    const visited = new Set<number>();
    let clusters = 0;
    for (let i = 0; i < this._count; i++) {
      if (visited.has(i)) continue;
      clusters++;
      const queue = [i];
      visited.add(i);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        const neighbors = this._getNeighbors(cur);
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
    }
    return clusters;
  }

  public computeCorrelationFunction(): number[] {
    const maxDist = Math.min(this._width, this._height) / 2;
    const bins = 20;
    const corr = new Array(bins).fill(0);
    const counts = new Array(bins).fill(0);
    for (let i = 0; i < this._count; i++) {
      for (let j = i + 1; j < this._count; j++) {
        let dx = this._agents[j].x - this._agents[i].x;
        let dy = this._agents[j].y - this._agents[i].y;
        dx = ((dx + this._width / 2) % this._width) - this._width / 2;
        dy = ((dy + this._height / 2) % this._height) - this._height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const bin = Math.floor(dist / (maxDist / bins));
        if (bin < bins) {
          const vi = [Math.cos(this._agents[i].theta), Math.sin(this._agents[i].theta)];
          const vj = [Math.cos(this._agents[j].theta), Math.sin(this._agents[j].theta)];
          corr[bin] += vi[0] * vj[0] + vi[1] * vj[1];
          counts[bin]++;
        }
      }
    }
    for (let b = 0; b < bins; b++) {
      if (counts[b] > 0) corr[b] /= counts[b];
    }
    return corr;
  }

  public simulatePhaseTransition(noiseValues: number[], stepsPerNoise: number = 200): { noise: number; polarization: number }[] {
    const results: { noise: number; polarization: number }[] = [];
    for (const n of noiseValues) {
      this._noise = n;
      this._agents = [];
      for (let i = 0; i < this._count; i++) {
        this._agents.push({
          x: Math.random() * this._width,
          y: Math.random() * this._height,
          theta: Math.random() * 2 * Math.PI,
          speed: this._speed,
          neighborCount: 0
        });
      }
      for (let s = 0; s < stepsPerNoise; s++) {
        this.step();
      }
      results.push({ noise: n, polarization: this.computePolarization() });
    }
    return results;
  }

  private _recordOrder(): void {
    this._history.push({
      step: this._currentStep,
      polarization: this.computePolarization(),
      angularMomentum: this.computeAngularMomentum(),
      rotation: this.computeRotation()
    });
    if (this._history.length > 1000) this._history.shift();
  }

  public reset(): void {
    this._agents = [];
    for (let i = 0; i < this._count; i++) {
      this._agents.push({
        x: Math.random() * this._width,
        y: Math.random() * this._height,
        theta: Math.random() * 2 * Math.PI,
        speed: this._speed,
        neighborCount: 0
      });
    }
    this._history = [];
    this._currentStep = 0;
  }

  public exportAgents(): AgentState[] {
    return this._agents.map(a => ({ ...a }));
  }

  public exportHistory(): OrderParameter[] {
    return this._history.map(h => ({ ...h }));
  }
}
