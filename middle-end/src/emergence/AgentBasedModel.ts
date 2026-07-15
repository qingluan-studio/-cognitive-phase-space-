export interface Agent {
  id: number;
  x: number;
  y: number;
  type: number;
  happiness: number;
  vision: number;
}

export interface ModelSnapshot {
  step: number;
  segregationIndex: number;
  meanHappiness: number;
  agentCount: number;
}

export class AgentBasedModel {
  private _agents: Agent[];
  private _grid: (number | null)[][];
  private _width: number;
  private _height: number;
  private _typeCount: number;
  private _happinessThreshold: number;
  private _history: ModelSnapshot[];
  private _currentStep: number;

  constructor(width: number, height: number, typeCount: number = 2, threshold: number = 0.3) {
    this._width = width;
    this._height = height;
    this._typeCount = typeCount;
    this._happinessThreshold = threshold;
    this._agents = [];
    this._history = [];
    this._currentStep = 0;
    this._grid = Array.from({ length: height }, () => new Array(width).fill(null));
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get typeCount(): number { return this._typeCount; }
  get happinessThreshold(): number { return this._happinessThreshold; }
  get currentStep(): number { return this._currentStep; }
  get history(): ModelSnapshot[] { return this._history; }

  public setThreshold(t: number): void {
    this._happinessThreshold = t;
  }

  public populate(density: number = 0.8): void {
    this._agents = [];
    this._grid = Array.from({ length: this._height }, () => new Array(this._width).fill(null));
    let id = 0;
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        if (Math.random() < density) {
          const type = Math.floor(Math.random() * this._typeCount);
          const agent: Agent = { id, x, y, type, happiness: 0, vision: 1 };
          this._agents.push(agent);
          this._grid[y][x] = id;
          id++;
        }
      }
    }
    this._computeHappiness();
  }

  private _computeHappiness(): void {
    for (const agent of this._agents) {
      let same = 0;
      let total = 0;
      for (let dy = -agent.vision; dy <= agent.vision; dy++) {
        for (let dx = -agent.vision; dx <= agent.vision; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = agent.x + dx;
          const ny = agent.y + dy;
          if (nx >= 0 && nx < this._width && ny >= 0 && ny < this._height) {
            const neighborId = this._grid[ny][nx];
            if (neighborId !== null) {
              total++;
              if (this._agents[neighborId].type === agent.type) same++;
            }
          }
        }
      }
      agent.happiness = total > 0 ? same / total : 1.0;
    }
  }

  public step(): number {
    this._currentStep++;
    const unhappy = this._agents.filter(a => a.happiness < this._happinessThreshold);
    const emptySpots: { x: number; y: number }[] = [];
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        if (this._grid[y][x] === null) emptySpots.push({ x, y });
      }
    }
    let moves = 0;
    for (const agent of unhappy) {
      if (emptySpots.length === 0) break;
      const idx = Math.floor(Math.random() * emptySpots.length);
      const spot = emptySpots.splice(idx, 1)[0];
      this._grid[agent.y][agent.x] = null;
      agent.x = spot.x;
      agent.y = spot.y;
      this._grid[agent.y][agent.x] = agent.id;
      moves++;
    }
    this._computeHappiness();
    this._recordSnapshot();
    return moves;
  }

  public run(maxSteps: number = 100): void {
    for (let i = 0; i < maxSteps; i++) {
      const moves = this.step();
      if (moves === 0) break;
    }
  }

  public computeSegregationIndex(): number {
    let totalSame = 0;
    let totalNeighbors = 0;
    for (const agent of this._agents) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = agent.x + dx;
          const ny = agent.y + dy;
          if (nx >= 0 && nx < this._width && ny >= 0 && ny < this._height) {
            const nid = this._grid[ny][nx];
            if (nid !== null) {
              totalNeighbors++;
              if (this._agents[nid].type === agent.type) totalSame++;
            }
          }
        }
      }
    }
    return totalNeighbors > 0 ? totalSame / totalNeighbors : 0;
  }

  public computeMeanHappiness(): number {
    if (this._agents.length === 0) return 0;
    return this._agents.reduce((sum, a) => sum + a.happiness, 0) / this._agents.length;
  }

  public computeClusteringCoefficient(): number {
    const clusters: number[][] = [];
    const visited = new Set<number>();
    for (const agent of this._agents) {
      if (visited.has(agent.id)) continue;
      const cluster: number[] = [];
      const queue = [agent.id];
      visited.add(agent.id);
      while (queue.length > 0) {
        const curId = queue.shift()!;
        cluster.push(curId);
        const cur = this._agents[curId];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            if (nx >= 0 && nx < this._width && ny >= 0 && ny < this._height) {
              const nid = this._grid[ny][nx];
              if (nid !== null && !visited.has(nid) && this._agents[nid].type === cur.type) {
                visited.add(nid);
                queue.push(nid);
              }
            }
          }
        }
      }
      clusters.push(cluster);
    }
    if (clusters.length === 0) return 0;
    return clusters.reduce((sum, c) => sum + c.length, 0) / clusters.length;
  }

  public getAgentsByType(type: number): Agent[] {
    return this._agents.filter(a => a.type === type).map(a => ({ ...a }));
  }

  public getAgentDistribution(): Map<number, number> {
    const dist = new Map<number, number>();
    for (const agent of this._agents) {
      dist.set(agent.type, (dist.get(agent.type) || 0) + 1);
    }
    return dist;
  }

  public simulateBoidFlocking(agentCount: number, steps: number): { x: number; y: number; vx: number; vy: number }[] {
    const boids: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let i = 0; i < agentCount; i++) {
      boids.push({
        x: Math.random() * this._width,
        y: Math.random() * this._height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      });
    }
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < agentCount; i++) {
        let sepX = 0, sepY = 0, alignX = 0, alignY = 0, cohX = 0, cohY = 0;
        let count = 0;
        for (let j = 0; j < agentCount; j++) {
          if (i === j) continue;
          const dx = boids[j].x - boids[i].x;
          const dy = boids[j].y - boids[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) {
            sepX -= dx / dist;
            sepY -= dy / dist;
            alignX += boids[j].vx;
            alignY += boids[j].vy;
            cohX += boids[j].x;
            cohY += boids[j].y;
            count++;
          }
        }
        if (count > 0) {
          boids[i].vx += sepX * 0.05 + (alignX / count - boids[i].vx) * 0.05 + (cohX / count - boids[i].x) * 0.01;
          boids[i].vy += sepY * 0.05 + (alignY / count - boids[i].vy) * 0.05 + (cohY / count - boids[i].y) * 0.01;
        }
        const speed = Math.sqrt(boids[i].vx ** 2 + boids[i].vy ** 2);
        if (speed > 2) {
          boids[i].vx = (boids[i].vx / speed) * 2;
          boids[i].vy = (boids[i].vy / speed) * 2;
        }
        boids[i].x += boids[i].vx;
        boids[i].y += boids[i].vy;
        if (boids[i].x < 0) boids[i].x += this._width;
        if (boids[i].x >= this._width) boids[i].x -= this._width;
        if (boids[i].y < 0) boids[i].y += this._height;
        if (boids[i].y >= this._height) boids[i].y -= this._height;
      }
    }
    return boids;
  }

  public computeSpatialAutocorrelation(): number {
    let numerator = 0;
    let denominator = 0;
    const mean = this._agents.reduce((sum, a) => sum + a.type, 0) / this._agents.length;
    for (let i = 0; i < this._agents.length; i++) {
      for (let j = i + 1; j < this._agents.length; j++) {
        const dx = this._agents[i].x - this._agents[j].x;
        const dy = this._agents[i].y - this._agents[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const w = dist < 3 ? 1 : 0;
        numerator += w * (this._agents[i].type - mean) * (this._agents[j].type - mean);
        denominator += w;
      }
    }
    const varSum = this._agents.reduce((sum, a) => sum + (a.type - mean) ** 2, 0);
    return denominator > 0 && varSum > 0 ? (numerator / denominator) / (varSum / this._agents.length) : 0;
  }

  private _recordSnapshot(): void {
    this._history.push({
      step: this._currentStep,
      segregationIndex: this.computeSegregationIndex(),
      meanHappiness: this.computeMeanHappiness(),
      agentCount: this._agents.length
    });
  }

  public reset(): void {
    this._agents = [];
    this._grid = Array.from({ length: this._height }, () => new Array(this._width).fill(null));
    this._history = [];
    this._currentStep = 0;
  }

  public exportGrid(): (number | null)[][] {
    return this._grid.map(row => [...row]);
  }
}
