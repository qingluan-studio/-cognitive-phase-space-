import { DataPacket } from '../shared/types';

export interface Path {
  readonly points: [number, number][];
  readonly cost: number;
  readonly length: number;
  readonly smooth: boolean;
  readonly time?: number;
  readonly velocity?: number[];
}

export interface Configuration {
  readonly start: [number, number];
  readonly goal: [number, number];
  readonly obstacles: [number, number, number][];
  readonly bounds: { x: number; y: number };
  readonly resolution?: number;
}

export interface Planner {
  readonly type: string;
  readonly nodes: number;
  readonly edges: number;
  readonly built: boolean;
  readonly time: number;
}

export interface GraphNode {
  readonly id: number;
  readonly position: [number, number];
  readonly neighbors: number[];
  readonly cost: number;
  readonly heuristic?: number;
  readonly parent?: number;
}

export interface OptimizedPath {
  readonly original: number;
  readonly optimized: number;
  readonly improvement: number;
  readonly path: Path;
  readonly iterations: number;
}

export interface RRTNode {
  readonly id: number;
  readonly position: [number, number];
  readonly parentId: number | null;
  readonly cost: number;
  readonly children: number[];
}

export interface GridCell {
  readonly x: number;
  readonly y: number;
  readonly occupied: boolean;
  readonly cost: number;
  readonly visited: boolean;
}

export interface PathMetrics {
  readonly length: number;
  readonly smoothness: number;
  readonly clearance: number;
  readonly time: number;
  readonly curvature: number;
  readonly jerk: number;
}

export interface BezierControl {
  readonly start: [number, number];
  readonly control1: [number, number];
  readonly control2: [number, number];
  readonly end: [number, number];
}

export class PathPlanning {
  private _paths: Path[] = [];
  private _configs: Configuration[] = [];
  private _planners: Map<string, Planner> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _grid: GridCell[][] = [];
  private _rrtNodes: Map<number, RRTNode> = new Map();

  get pathCount(): number {
    return this._paths.length;
  }

  get configCount(): number {
    return this._configs.length;
  }

  get plannerCount(): number {
    return this._planners.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get grid(): GridCell[][] {
    return this._grid.map(row => row.map(cell => ({ ...cell })));
  }

  public aStar(graph: { nodes: GraphNode[] }, start: number, goal: number, weight: number = 1): { path: number[]; cost: number; visited: number; found: boolean; closedSet: number[] } {
    const open = new Set<number>([start]);
    const closed = new Set<number>();
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>([[start, 0]]);
    const fScore = new Map<number, number>([[start, this._heuristic(start, goal, graph.nodes)]]);
    let visited = 0;

    while (open.size > 0 && visited < 10000) {
      let current = -1;
      let minF = Infinity;
      for (const n of open) {
        const f = fScore.get(n) ?? Infinity;
        if (f < minF) { minF = f; current = n; }
      }
      if (current === -1) break;
      visited++;

      if (current === goal) {
        const path = [current];
        let temp = current;
        while (cameFrom.has(temp)) {
          temp = cameFrom.get(temp)!;
          path.unshift(temp);
        }
        this._recordHistory(`aStar(path=${path.length}, visited=${visited}, weight=${weight})`);
        return { path, cost: gScore.get(goal) ?? 0, visited, found: true, closedSet: Array.from(closed) };
      }

      open.delete(current);
      closed.add(current);
      const node = graph.nodes[current];
      if (!node) break;

      for (const neighbor of node.neighbors) {
        if (closed.has(neighbor)) continue;

        const tentative = (gScore.get(current) ?? 0) + this._distance(node.position, graph.nodes[neighbor]?.position ?? [0, 0]);
        if (tentative < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentative);
          fScore.set(neighbor, tentative + weight * this._heuristic(neighbor, goal, graph.nodes));
          open.add(neighbor);
        }
      }
    }

    this._recordHistory(`aStar(failed, visited=${visited})`);
    return { path: [], cost: 0, visited, found: false, closedSet: Array.from(closed) };
  }

  public weightedAStar(graph: { nodes: GraphNode[] }, start: number, goal: number, weights: { g: number; h: number }): { path: number[]; cost: number; visited: number; found: boolean } {
    const result = this.aStar(graph, start, goal, weights.h / weights.g);
    return { path: result.path, cost: result.cost, visited: result.visited, found: result.found };
  }

  public dijkstra(graph: { nodes: GraphNode[] }, start: number): { distances: Map<number, number>; visited: number; predecessors: Map<number, number> } {
    const distances = new Map<number, number>([[start, 0]]);
    const predecessors = new Map<number, number>();
    const visited = new Set<number>();
    const queue = new Set<number>([start]);

    while (queue.size > 0 && visited.size < 10000) {
      let current = -1;
      let minD = Infinity;
      for (const n of queue) {
        const d = distances.get(n) ?? Infinity;
        if (d < minD) { minD = d; current = n; }
      }
      if (current === -1) break;

      queue.delete(current);
      visited.add(current);
      const node = graph.nodes[current];
      if (!node) continue;

      for (const neighbor of node.neighbors) {
        const alt = (distances.get(current) ?? 0) + this._distance(node.position, graph.nodes[neighbor]?.position ?? [0, 0]);
        if (alt < (distances.get(neighbor) ?? Infinity)) {
          distances.set(neighbor, alt);
          predecessors.set(neighbor, current);
          queue.add(neighbor);
        }
      }
    }

    this._recordHistory(`dijkstra(start=${start}, visited=${visited.size})`);
    return { distances, visited: visited.size, predecessors };
  }

  public bellmanFord(graph: { nodes: GraphNode[]; edges: { from: number; to: number; weight: number }[] }, start: number): { distances: Map<number, number>; hasNegativeCycle: boolean; predecessors: Map<number, number> } {
    const n = graph.nodes.length;
    const distances = new Map<number, number>();
    const predecessors = new Map<number, number>();

    for (let i = 0; i < n; i++) {
      distances.set(i, i === start ? 0 : Infinity);
    }

    for (let i = 0; i < n - 1; i++) {
      for (const edge of graph.edges) {
        const currentDist = distances.get(edge.from) ?? Infinity;
        const newDist = currentDist + edge.weight;
        if (newDist < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, newDist);
          predecessors.set(edge.to, edge.from);
        }
      }
    }

    let hasNegativeCycle = false;
    for (const edge of graph.edges) {
      const currentDist = distances.get(edge.from) ?? Infinity;
      const newDist = currentDist + edge.weight;
      if (newDist < (distances.get(edge.to) ?? Infinity)) {
        hasNegativeCycle = true;
        break;
      }
    }

    this._recordHistory(`bellmanFord(start=${start}, hasNegativeCycle=${hasNegativeCycle})`);
    return { distances, hasNegativeCycle, predecessors };
  }

  public rrt(start: [number, number], goal: [number, number], obstacles: [number, number, number][], steps: number, stepSize: number = 5): { path: [number, number][]; nodes: number; found: boolean; exploredArea: number } {
    const nodes: [number, number][] = [start];
    const exploredArea = 0;

    for (let i = 0; i < steps; i++) {
      const sample: [number, number] = [Math.random() * 100, Math.random() * 100];
      let nearest = 0;
      let minDist = Infinity;

      for (let j = 0; j < nodes.length; j++) {
        const d = this._distance(nodes[j], sample);
        if (d < minDist) { minDist = d; nearest = j; }
      }

      const parent = nodes[nearest];
      const direction = this._normalize([sample[0] - parent[0], sample[1] - parent[1]]);
      const step: [number, number] = [
        parent[0] + direction[0] * stepSize,
        parent[1] + direction[1] * stepSize,
      ];

      if (!this._collision(step, obstacles)) {
        nodes.push(step);
      }

      if (this._distance(step, goal) < stepSize) {
        nodes.push(goal);
        this._recordHistory(`rrt(steps=${steps}, nodes=${nodes.length}, found=true)`);
        return { path: nodes, nodes: nodes.length, found: true, exploredArea };
      }
    }

    this._recordHistory(`rrt(steps=${steps}, nodes=${nodes.length}, found=false)`);
    return { path: nodes, nodes: nodes.length, found: false, exploredArea };
  }

  public rrtStar(start: [number, number], goal: [number, number], obstacles: [number, number, number][], steps: number, stepSize: number = 5, rewireRadius: number = 15): { path: [number, number][]; nodes: number; cost: number; optimized: boolean } {
    const nodes: RRTNode[] = [{ id: 0, position: start, parentId: null, cost: 0, children: [] }];
    this._rrtNodes.clear();
    this._rrtNodes.set(0, nodes[0]);

    for (let i = 0; i < steps; i++) {
      const sample: [number, number] = [Math.random() * 100, Math.random() * 100];
      let nearestId = 0;
      let minDist = Infinity;

      for (const node of nodes) {
        const d = this._distance(node.position, sample);
        if (d < minDist) { minDist = d; nearestId = node.id; }
      }

      const nearest = nodes.find(n => n.id === nearestId)!;
      const direction = this._normalize([sample[0] - nearest.position[0], sample[1] - nearest.position[1]]);
      const newPos: [number, number] = [
        nearest.position[0] + direction[0] * stepSize,
        nearest.position[1] + direction[1] * stepSize,
      ];

      if (this._collision(newPos, obstacles)) continue;

      let bestParentId = nearestId;
      let bestCost = nearest.cost + stepSize;

      for (const node of nodes) {
        const d = this._distance(node.position, newPos);
        if (d <= rewireRadius && !this._collision(newPos, obstacles)) {
          const cost = node.cost + d;
          if (cost < bestCost) {
            bestCost = cost;
            bestParentId = node.id;
          }
        }
      }

      const newNode: RRTNode = { id: i + 1, position: newPos, parentId: bestParentId, cost: bestCost, children: [] };
      nodes.push(newNode);
      this._rrtNodes.set(newNode.id, newNode);

      const oldParent = nodes.find(n => n.id === bestParentId);
      if (oldParent) oldParent.children.push(newNode.id);

      for (const node of nodes) {
        if (node.id === newNode.id) continue;
        const d = this._distance(node.position, newPos);
        if (d <= rewireRadius && !this._collision(node.position, obstacles)) {
          const newCost = newNode.cost + d;
          if (newCost < node.cost) {
            const oldParentNode = nodes.find(n => n.id === node.parentId);
            if (oldParentNode) {
              oldParentNode.children = oldParentNode.children.filter(c => c !== node.id);
            }
            node.parentId = newNode.id;
            node.cost = newCost;
            newNode.children.push(node.id);
          }
        }
      }

      if (this._distance(newPos, goal) < stepSize) {
        const goalNode: RRTNode = { id: i + 2, position: goal, parentId: newNode.id, cost: newNode.cost + this._distance(newPos, goal), children: [] };
        nodes.push(goalNode);
        this._rrtNodes.set(goalNode.id, goalNode);
        newNode.children.push(goalNode.id);
        const path = this._reconstructRRTPath(goalNode.id);
        const cost = goalNode.cost;
        this._recordHistory(`rrtStar(steps=${steps}, cost=${cost.toFixed(3)})`);
        return { path, nodes: nodes.length, cost, optimized: true };
      }
    }

    const path = this._reconstructRRTPath(nodes.length > 0 ? nodes[nodes.length - 1].id : 0);
    const cost = nodes.length > 0 ? nodes[nodes.length - 1].cost : 0;
    this._recordHistory(`rrtStar(steps=${steps}, cost=${cost.toFixed(3)})`);
    return { path, nodes: nodes.length, cost, optimized: true };
  }

  public rrtConnect(start: [number, number], goal: [number, number], obstacles: [number, number, number][], steps: number, stepSize: number = 5): { path: [number, number][]; nodes: number; found: boolean; trees: number } {
    const tree1: [number, number][] = [start];
    const tree2: [number, number][] = [goal];
    let connected = false;
    let path: [number, number][] = [];

    for (let i = 0; i < steps; i++) {
      const sample: [number, number] = [Math.random() * 100, Math.random() * 100];
      const nearest1 = this._findNearest(tree1, sample);
      const dir1 = this._normalize([sample[0] - tree1[nearest1][0], sample[1] - tree1[nearest1][1]]);
      const new1: [number, number] = [
        tree1[nearest1][0] + dir1[0] * stepSize,
        tree1[nearest1][1] + dir1[1] * stepSize,
      ];

      if (!this._collision(new1, obstacles)) {
        tree1.push(new1);
        const nearest2 = this._findNearest(tree2, new1);
        if (this._distance(new1, tree2[nearest2]) < stepSize) {
          connected = true;
          path = [...tree1, ...tree2.slice(0, nearest2 + 1).reverse()];
          break;
        }
      }

      [tree1, tree2] = [tree2, tree1];
    }

    this._recordHistory(`rrtConnect(steps=${steps}, found=${connected})`);
    return { path, nodes: tree1.length + tree2.length, found: connected, trees: 2 };
  }

  public prm(space: { bounds: { x: number; y: number } }, samples: number, k: number = 10): { nodes: [number, number][]; edges: [number, number][]; roadmap: boolean; connected: boolean } {
    const nodes: [number, number][] = [];
    const edges: [number, number][] = [];

    for (let i = 0; i < samples; i++) {
      nodes.push([Math.random() * space.bounds.x, Math.random() * space.bounds.y]);
    }

    for (let i = 0; i < samples; i++) {
      const distances: { idx: number; dist: number }[] = [];
      for (let j = 0; j < samples; j++) {
        if (i !== j) {
          distances.push({ idx: j, dist: this._distance(nodes[i], nodes[j]) });
        }
      }
      distances.sort((a, b) => a.dist - b.dist);
      for (let j = 0; j < Math.min(k, distances.length); j++) {
        edges.push([i, distances[j].idx]);
      }
    }

    this._recordHistory(`prm(samples=${samples}, edges=${edges.length})`);
    return { nodes, edges, roadmap: true, connected: edges.length >= samples - 1 };
  }

  public prmStar(space: { bounds: { x: number; y: number } }, samples: number, k: number = 10, r: number = 10): { nodes: [number, number][]; edges: [number, number][]; cost: number; optimized: boolean } {
    const result = this.prm(space, samples, k);
    const cost = result.edges.reduce((sum, edge) => sum + this._distance(result.nodes[edge[0]], result.nodes[edge[1]]), 0);
    this._recordHistory(`prmStar(samples=${samples}, cost=${cost.toFixed(3)})`);
    return { ...result, cost, optimized: true };
  }

  public potentialField(position: [number, number], goal: [number, number], obstacles: [number, number, number][], attractiveGain: number = 0.5, repulsiveGain: number = 1.0, repulsiveRadius: number = 20): { gradient: [number, number]; magnitude: number; attractive: number; repulsive: number; potential: number } {
    const attractive: [number, number] = [
      attractiveGain * (goal[0] - position[0]),
      attractiveGain * (goal[1] - position[1]),
    ];

    let repulsive: [number, number] = [0, 0];
    let potential = 0;

    for (const o of obstacles) {
      const dx = position[0] - o[0];
      const dy = position[1] - o[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < repulsiveRadius && dist > 0) {
        const force = repulsiveGain * (1 / dist - 1 / repulsiveRadius) / (dist * dist);
        repulsive[0] += force * (dx / dist);
        repulsive[1] += force * (dy / dist);
        potential += repulsiveGain * (1 / 2) * Math.pow(1 / dist - 1 / repulsiveRadius, 2);
      }
    }

    potential += attractiveGain * (1 / 2) * this._distance(position, goal);
    const gradient: [number, number] = [attractive[0] + repulsive[0], attractive[1] + repulsive[1]];
    const magnitude = Math.sqrt(gradient[0] * gradient[0] + gradient[1] * gradient[1]);

    this._recordHistory(`potentialField(mag=${magnitude.toFixed(3)})`);
    return { gradient, magnitude, attractive: Math.sqrt(attractive[0] ** 2 + attractive[1] ** 2), repulsive: Math.sqrt(repulsive[0] ** 2 + repulsive[1] ** 2), potential };
  }

  public potentialFieldPath(start: [number, number], goal: [number, number], obstacles: [number, number, number][], steps: number = 500, stepSize: number = 0.5): { path: [number, number][]; reached: boolean; steps: number; localMinima: number } {
    const path: [number, number][] = [start];
    let pos = [...start] as [number, number];
    let localMinima = 0;
    let stuckCounter = 0;

    for (let i = 0; i < steps; i++) {
      const field = this.potentialField(pos, goal, obstacles);

      if (field.magnitude < 0.01) {
        stuckCounter++;
        if (stuckCounter > 10) {
          localMinima++;
          pos[0] += (Math.random() - 0.5) * 2;
          pos[1] += (Math.random() - 0.5) * 2;
          stuckCounter = 0;
        }
      } else {
        stuckCounter = 0;
        const dir = this._normalize([field.gradient[0], field.gradient[1]]);
        pos[0] += dir[0] * stepSize;
        pos[1] += dir[1] * stepSize;
      }

      path.push([...pos]);

      if (this._distance(pos, goal) < 0.5) {
        path.push(goal);
        this._recordHistory(`potentialFieldPath(reached=true, steps=${i + 1})`);
        return { path, reached: true, steps: i + 1, localMinima };
      }
    }

    this._recordHistory(`potentialFieldPath(reached=false, steps=${steps})`);
    return { path, reached: false, steps, localMinima };
  }

  public bugAlgorithm(start: [number, number], goal: [number, number], obstacles: [number, number, number][]): { path: [number, number][]; steps: number; reached: boolean; mode: 'go-to-goal' | 'wall-following' } {
    const path: [number, number][] = [start];
    const steps = 500;
    let pos = [...start] as [number, number];
    let mode: 'go-to-goal' | 'wall-following' = 'go-to-goal';
    let hitPoint: [number, number] | null = null;
    let wallAngle = 0;

    for (let i = 0; i < steps; i++) {
      const toGoal = [goal[0] - pos[0], goal[1] - pos[1]];
      const dist = Math.sqrt(toGoal[0] ** 2 + toGoal[1] ** 2);

      if (dist < 1) {
        path.push(goal);
        this._recordHistory(`bugAlgorithm(reached=true, mode=${mode})`);
        return { path, steps: i + 1, reached: true, mode };
      }

      let nextPos: [number, number];
      if (mode === 'go-to-goal') {
        const dir = this._normalize(toGoal);
        nextPos = [pos[0] + dir[0], pos[1] + dir[1]];

        if (this._collision(nextPos, obstacles)) {
          hitPoint = [...pos];
          mode = 'wall-following';
          wallAngle = Math.atan2(dir[1], dir[0]) + Math.PI / 2;
        }
      }

      if (mode === 'wall-following') {
        nextPos = [
          pos[0] + Math.cos(wallAngle),
          pos[1] + Math.sin(wallAngle),
        ];

        if (!this._collision(nextPos, obstacles)) {
          const distToHit = hitPoint ? this._distance(pos, hitPoint) : Infinity;
          const distToGoal = this._distance(pos, goal);
          if (distToGoal < distToHit) {
            mode = 'go-to-goal';
            continue;
          }
        } else {
          wallAngle += 0.1;
          continue;
        }
      }

      pos = nextPos;
      path.push([...pos]);
    }

    this._recordHistory(`bugAlgorithm(reached=false)`);
    return { path, steps, reached: false, mode };
  }

  public wavefront(grid: number[][], start: [number, number], goal: [number, number]): { path: [number, number][]; cost: number; found: boolean; waveTime: number } {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const wave: number[][] = grid.map(row => row.map(() => -1));
    const queue: [number, number][] = [start];
    wave[start[0]][start[1]] = 0;

    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      if (x === goal[0] && y === goal[1]) break;

      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < rows && ny >= 0 && ny < cols && wave[nx][ny] === -1 && grid[nx][ny] === 0) {
          wave[nx][ny] = wave[x][y] + 1;
          queue.push([nx, ny]);
        }
      }
    }

    if (wave[goal[0]][goal[1]] === -1) {
      this._recordHistory(`wavefront(found=false)`);
      return { path: [], cost: 0, found: false, waveTime: 0 };
    }

    const path: [number, number][] = [goal];
    let [x, y] = goal;

    while (x !== start[0] || y !== start[1]) {
      let minVal = Infinity;
      let next = [x, y];

      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < rows && ny >= 0 && ny < cols && wave[nx][ny] < minVal && wave[nx][ny] >= 0) {
          minVal = wave[nx][ny];
          next = [nx, ny];
        }
      }

      [x, y] = next;
      path.unshift([x, y]);
    }

    this._recordHistory(`wavefront(path=${path.length})`);
    return { path, cost: path.length, found: true, waveTime: wave[goal[0]][goal[1]] };
  }

  public visibilityGraph(obstacles: [number, number, number][], start: [number, number], goal: [number, number]): { edges: [number, number][]; nodes: [number, number][]; built: boolean; graphSize: number } {
    const nodes: [number, number][] = [start, goal];
    const edgeMap = new Set<string>();

    for (const obs of obstacles) {
      const [cx, cy, r] = obs;
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        nodes.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (!this._lineCollision(nodes[i], nodes[j], obstacles)) {
          const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
          edgeMap.add(key);
        }
      }
    }

    const edges = Array.from(edgeMap).map(key => key.split('-').map(Number) as [number, number]);
    this._recordHistory(`visibilityGraph(nodes=${nodes.length}, edges=${edges.length})`);
    return { edges, nodes, built: true, graphSize: nodes.length };
  }

  public voronoiDiagram(obstacles: [number, number, number][]): { cells: { region: [number, number][]; seed: [number, number] }[]; vertices: [number, number][]; edges: [number, number][]; complexity: number } {
    const cells: { region: [number, number][]; seed: [number, number][] }[] = [];
    const vertices: [number, number][] = [];
    const edges: [number, number][] = [];

    for (const obs of obstacles) {
      const region: [number, number][] = [];
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
        region.push([obs[0] + obs[2] * 2 * Math.cos(angle), obs[1] + obs[2] * 2 * Math.sin(angle)]);
      }
      cells.push({ region, seed: [obs[0], obs[1]] });
    }

    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const midX = (cells[i].seed[0] + cells[j].seed[0]) / 2;
        const midY = (cells[i].seed[1] + cells[j].seed[1]) / 2;
        vertices.push([midX, midY]);
        edges.push([i, j]);
      }
    }

    this._recordHistory(`voronoi(cells=${cells.length})`);
    return { cells, vertices, edges, complexity: cells.length * cells.length };
  }

  public dStarLite(start: [number, number], goal: [number, number], obstacles: [number, number, number][]): { path: [number, number][]; cost: number; replanned: boolean; nodesExpanded: number } {
    const path: [number, number][] = [start];
    let current = start;
    const nodesExpanded = 100;

    while (this._distance(current, goal) > 1) {
      const neighbors = this._getNeighbors(current);
      let bestNeighbor = neighbors[0];
      let minCost = Infinity;

      for (const neighbor of neighbors) {
        if (!this._collision(neighbor, obstacles)) {
          const cost = this._distance(neighbor, goal) + this._distance(current, neighbor);
          if (cost < minCost) {
            minCost = cost;
            bestNeighbor = neighbor;
          }
        }
      }

      current = bestNeighbor;
      path.push(current);
    }

    path.push(goal);
    this._recordHistory(`dStarLite(path=${path.length})`);
    return { path, cost: path.length, replanned: false, nodesExpanded };
  }

  public aStarGrid(grid: GridCell[][], start: [number, number], goal: [number, number]): { path: [number, number][]; cost: number; found: boolean; visited: number } {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const open = new Set<string>();
    const closed = new Set<string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, [number, number]>();

    const key = (x: number, y: number) => `${x},${y}`;
    open.add(key(start[0], start[1]));
    gScore.set(key(start[0], start[1]), 0);
    fScore.set(key(start[0], start[1]), this._distance(start, goal));

    let visited = 0;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

    while (open.size > 0) {
      let minF = Infinity;
      let current: [number, number] = [0, 0];

      for (const k of open) {
        const [x, y] = k.split(',').map(Number);
        const f = fScore.get(k) ?? Infinity;
        if (f < minF) {
          minF = f;
          current = [x, y];
        }
      }

      if (current[0] === goal[0] && current[1] === goal[1]) {
        const path: [number, number][] = [current];
        let k = key(current[0], current[1]);
        while (cameFrom.has(k)) {
          current = cameFrom.get(k)!;
          path.unshift(current);
          k = key(current[0], current[1]);
        }
        this._recordHistory(`aStarGrid(path=${path.length})`);
        return { path, cost: gScore.get(key(goal[0], goal[1])) ?? 0, found: true, visited };
      }

      open.delete(key(current[0], current[1]));
      closed.add(key(current[0], current[1]));
      visited++;

      for (const [dx, dy] of dirs) {
        const nx = current[0] + dx;
        const ny = current[1] + dy;

        if (nx < 0 || nx >= rows || ny < 0 || ny >= cols) continue;
        if (grid[nx][ny].occupied) continue;

        const nk = key(nx, ny);
        if (closed.has(nk)) continue;

        const tentative = (gScore.get(key(current[0], current[1])) ?? Infinity) + grid[nx][ny].cost + (dx !== 0 && dy !== 0 ? 0.414 : 1);

        if (tentative < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, current);
          gScore.set(nk, tentative);
          fScore.set(nk, tentative + this._distance([nx, ny], goal));
          open.add(nk);
        }
      }
    }

    this._recordHistory(`aStarGrid(found=false)`);
    return { path: [], cost: 0, found: false, visited };
  }

  public optimizePath(path: Path, constraints: { maxCurvature: number; maxVelocity: number }): OptimizedPath {
    const original = path.cost;
    let optimized = original;
    let iterations = 0;

    let newPoints = [...path.points];
    let changed = true;

    while (changed && iterations < 100) {
      changed = false;
      iterations++;

      for (let i = 1; i < newPoints.length - 1; i++) {
        const prev = newPoints[i - 1];
        const curr = newPoints[i];
        const next = newPoints[i + 1];

        const dist1 = this._distance(prev, curr);
        const dist2 = this._distance(curr, next);
        const distDirect = this._distance(prev, next);

        if (distDirect < dist1 + dist2 && distDirect > 0.1) {
          const mid: [number, number] = [(prev[0] + next[0]) / 2, (prev[1] + next[1]) / 2];
          const curvature = this._curvature(prev, mid, next);

          if (curvature < constraints.maxCurvature) {
            newPoints.splice(i, 1);
            changed = true;
            optimized = newPoints.reduce((s, p, idx) => idx > 0 ? s + this._distance(p, newPoints[idx - 1]) : 0, 0);
            break;
          }
        }
      }
    }

    const newPath: Path = { ...path, points: newPoints, cost: optimized, length: optimized, smooth: true };
    this._recordHistory(`optimizePath(improved=${((original - optimized) / original * 100).toFixed(2)}%)`);
    return { original, optimized, improvement: original - optimized, path: newPath, iterations };
  }

  public smoothPath(path: Path, method: 'spline' | 'bezier' | 'b-spline' | 'moving-average'): { smoothed: Path; method: string; points: number; error: number } {
    let newPoints = [...path.points];
    let error = 0;

    switch (method) {
      case 'moving-average':
        for (let i = 1; i < newPoints.length - 1; i++) {
          const prev = newPoints[i - 1];
          const curr = newPoints[i];
          const next = newPoints[i + 1];
          const smoothed: [number, number] = [
            (prev[0] + 2 * curr[0] + next[0]) / 4,
            (prev[1] + 2 * curr[1] + next[1]) / 4,
          ];
          error += this._distance(curr, smoothed);
          newPoints[i] = smoothed;
        }
        break;

      case 'bezier':
        if (newPoints.length >= 4) {
          const controlPoints = this._generateBezierControls(newPoints);
          newPoints = this._evaluateBezierCurve(controlPoints, 100);
        }
        break;

      case 'b-spline':
        newPoints = this._bsplineInterpolation(newPoints, 3);
        break;
    }

    const smoothed: Path = { ...path, points: newPoints, smooth: true };
    this._recordHistory(`smoothPath(${method}, error=${error.toFixed(3)})`);
    return { smoothed, method, points: newPoints.length, error };
  }

  public replan(current: [number, number], dynamic: [number, number, number][], obstacles: [number, number, number][], goal: [number, number]): { replanned: boolean; newPath: [number, number][]; obstacles: number; time: number } {
    const allObstacles = [...obstacles, ...dynamic];
    const result = this.aStarGrid(this._createGrid(allObstacles, { x: 100, y: 100 }), current, goal);

    this._recordHistory(`replan(obstacles=${allObstacles.length})`);
    return { replanned: result.found, newPath: result.path, obstacles: allObstacles.length, time: result.visited * 0.01 };
  }

  public trajectoryOptimization(path: Path, dynamics: { maxVel: number; maxAcc: number; maxJerk: number }): { trajectory: [number, number, number][]; feasible: boolean; time: number; velocityProfile: number[] } {
    const trajectory: [number, number, number][] = [];
    const velocityProfile: number[] = [];
    let time = 0;
    let velocity = 0;

    for (let i = 1; i < path.points.length; i++) {
      const dist = this._distance(path.points[i - 1], path.points[i]);
      const dt = dist / dynamics.maxVel;
      const acceleration = (dynamics.maxVel - velocity) / dt;

      if (Math.abs(acceleration) > dynamics.maxAcc) {
        const timeToMax = (dynamics.maxVel - velocity) / dynamics.maxAcc;
        const distAtMax = velocity * timeToMax + 0.5 * dynamics.maxAcc * timeToMax * timeToMax;
        if (distAtMax < dist) {
          trajectory.push([time, path.points[i][0], path.points[i][1]]);
          velocityProfile.push(dynamics.maxVel);
          velocity = dynamics.maxVel;
          time += timeToMax;
        } else {
          const t = Math.sqrt(2 * dist / dynamics.maxAcc);
          trajectory.push([time, path.points[i][0], path.points[i][1]]);
          velocityProfile.push(dynamics.maxAcc * t);
          velocity = dynamics.maxAcc * t;
          time += t;
        }
      } else {
        trajectory.push([time, path.points[i][0], path.points[i][1]]);
        velocityProfile.push(velocity + acceleration * dt);
        velocity += acceleration * dt;
        time += dt;
      }
    }

    this._recordHistory(`trajectoryOptimization(time=${time.toFixed(3)})`);
    return { trajectory, feasible: true, time, velocityProfile };
  }

  public pathMetrics(path: Path, obstacles: [number, number, number][]): PathMetrics {
    let length = 0;
    let smoothness = 0;
    let minClearance = Infinity;
    let curvature = 0;
    let jerk = 0;

    for (let i = 1; i < path.points.length; i++) {
      length += this._distance(path.points[i - 1], path.points[i]);
    }

    for (let i = 1; i < path.points.length - 1; i++) {
      const angle1 = Math.atan2(path.points[i][1] - path.points[i - 1][1], path.points[i][0] - path.points[i - 1][0]);
      const angle2 = Math.atan2(path.points[i + 1][1] - path.points[i][1], path.points[i + 1][0] - path.points[i][0]);
      smoothness += Math.abs(angle2 - angle1);
      curvature += this._curvature(path.points[i - 1], path.points[i], path.points[i + 1]);
    }

    for (const point of path.points) {
      for (const obs of obstacles) {
        const dist = Math.sqrt(Math.pow(point[0] - obs[0], 2) + Math.pow(point[1] - obs[1], 2)) - obs[2];
        if (dist < minClearance) minClearance = dist;
      }
    }

    if (path.points.length > 3) {
      for (let i = 2; i < path.points.length - 1; i++) {
        const c1 = this._curvature(path.points[i - 2], path.points[i - 1], path.points[i]);
        const c2 = this._curvature(path.points[i - 1], path.points[i], path.points[i + 1]);
        jerk += Math.abs(c2 - c1);
      }
    }

    const avgSmoothness = path.points.length > 2 ? smoothness / (path.points.length - 2) : 0;
    const avgCurvature = path.points.length > 2 ? curvature / (path.points.length - 2) : 0;
    const avgJerk = path.points.length > 3 ? jerk / (path.points.length - 3) : 0;

    this._recordHistory(`pathMetrics(length=${length.toFixed(2)}, clearance=${minClearance.toFixed(2)})`);
    return { length, smoothness: avgSmoothness, clearance: minClearance, time: length / 10, curvature: avgCurvature, jerk: avgJerk };
  }

  public generateBezierCurve(points: [number, number][]): { curve: [number, number][]; controls: BezierControl[]; segments: number } {
    if (points.length < 2) return { curve: [], controls: [], segments: 0 };

    const controls: BezierControl[] = [];
    const curve: [number, number][] = [points[0]];

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const mid: [number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
      const dir = this._normalize([end[0] - start[0], end[1] - start[1]]);
      const dist = this._distance(start, end) / 3;

      const control1: [number, number] = [start[0] + dir[0] * dist, start[1] + dir[1] * dist];
      const control2: [number, number] = [end[0] - dir[0] * dist, end[1] - dir[1] * dist];

      controls.push({ start, control1, control2, end });

      for (let t = 0.01; t <= 1; t += 0.01) {
        const x = Math.pow(1 - t, 3) * start[0] + 3 * Math.pow(1 - t, 2) * t * control1[0] + 3 * (1 - t) * Math.pow(t, 2) * control2[0] + Math.pow(t, 3) * end[0];
        const y = Math.pow(1 - t, 3) * start[1] + 3 * Math.pow(1 - t, 2) * t * control1[1] + 3 * (1 - t) * Math.pow(t, 2) * control2[1] + Math.pow(t, 3) * end[1];
        curve.push([x, y]);
      }
    }

    this._recordHistory(`generateBezierCurve(segments=${controls.length})`);
    return { curve, controls, segments: controls.length };
  }

  public createGrid(obstacles: [number, number, number][], bounds: { x: number; y: number }, resolution: number = 1): GridCell[][] {
    const width = Math.floor(bounds.x / resolution);
    const height = Math.floor(bounds.y / resolution);
    const grid: GridCell[][] = [];

    for (let x = 0; x < width; x++) {
      grid[x] = [];
      for (let y = 0; y < height; y++) {
        const pos: [number, number] = [x * resolution, y * resolution];
        let occupied = false;
        for (const obs of obstacles) {
          if (this._distance(pos, [obs[0], obs[1]]) < obs[2]) {
            occupied = true;
            break;
          }
        }
        grid[x][y] = { x, y, occupied, cost: occupied ? Infinity : 1, visited: false };
      }
    }

    this._grid = grid;
    this._recordHistory(`createGrid(width=${width}, height=${height})`);
    return grid;
  }

  public paths(): Path[] {
    return this._paths.map(p => ({ ...p, points: p.points.map(pt => [...pt] as [number, number]) }));
  }

  public savePath(path: Path, name: string): void {
    this._paths.push({ ...path, points: path.points.map(pt => [...pt] as [number, number]) });
    this._recordHistory(`savePath(name=${name})`);
  }

  public loadPath(index: number): Path | null {
    if (index < 0 || index >= this._paths.length) return null;
    return this._paths[index];
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _heuristic(a: number, b: number, nodes: GraphNode[]): number {
    const na = nodes[a];
    const nb = nodes[b];
    if (!na || !nb) return 0;
    return this._distance(na.position, nb.position);
  }

  private _distance(a: [number, number], b: [number, number]): number {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  }

  private _normalize(v: [number, number]): [number, number] {
    const mag = Math.sqrt(v[0] ** 2 + v[1] ** 2);
    return mag > 0 ? [v[0] / mag, v[1] / mag] : [0, 0];
  }

  private _collision(point: [number, number], obstacles: [number, number, number][]): boolean {
    for (const o of obstacles) {
      if (Math.pow(point[0] - o[0], 2) + Math.pow(point[1] - o[1], 2) < o[2] * o[2]) {
        return true;
      }
    }
    return false;
  }

  private _lineCollision(start: [number, number], end: [number, number], obstacles: [number, number, number][]): boolean {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point: [number, number] = [start[0] + dx * t, start[1] + dy * t];
      if (this._collision(point, obstacles)) return true;
    }
    return false;
  }

  private _findNearest(nodes: [number, number][], target: [number, number]): number {
    let nearest = 0;
    let minDist = Infinity;

    for (let i = 0; i < nodes.length; i++) {
      const d = this._distance(nodes[i], target);
      if (d < minDist) { minDist = d; nearest = i; }
    }

    return nearest;
  }

  private _reconstructRRTPath(endId: number): [number, number][] {
    const path: [number, number][] = [];
    let currentId = endId;

    while (currentId !== null && currentId !== undefined) {
      const node = this._rrtNodes.get(currentId);
      if (!node) break;
      path.unshift(node.position);
      currentId = node.parentId;
    }

    return path;
  }

  private _getNeighbors(point: [number, number]): [number, number][] {
    const neighbors: [number, number][] = [];
    const steps = 5;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        neighbors.push([point[0] + dx * steps, point[1] + dy * steps]);
      }
    }

    return neighbors;
  }

  private _curvature(p1: [number, number], p2: [number, number], p3: [number, number]): number {
    const dx1 = p2[0] - p1[0];
    const dy1 = p2[1] - p1[1];
    const dx2 = p3[0] - p2[0];
    const dy2 = p3[1] - p2[1];

    const cross = dx1 * dy2 - dy1 * dx2;
    const dist1 = this._distance(p1, p2);
    const dist2 = this._distance(p2, p3);

    if (dist1 * dist2 === 0) return 0;
    return Math.abs(cross) / (dist1 * dist2 * (dist1 + dist2));
  }

  private _createGrid(obstacles: [number, number, number][], bounds: { x: number; y: number }): GridCell[][] {
    return this.createGrid(obstacles, bounds);
  }

  private _generateBezierControls(points: [number, number][]): BezierControl[] {
    const controls: BezierControl[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const next = points[i + 2];
      const prev = points[i - 1];

      let control1: [number, number];
      let control2: [number, number];

      if (i === 0) {
        const dir = this._normalize([end[0] - start[0], end[1] - start[1]]);
        const dist = this._distance(start, end) / 3;
        control1 = [start[0] + dir[0] * dist, start[1] + dir[1] * dist];
        control2 = [end[0] - dir[0] * dist, end[1] - dir[1] * dist];
      } else if (i === points.length - 2) {
        const dir = this._normalize([end[0] - start[0], end[1] - start[1]]);
        const dist = this._distance(start, end) / 3;
        control1 = [start[0] + dir[0] * dist, start[1] + dir[1] * dist];
        control2 = [end[0] - dir[0] * dist, end[1] - dir[1] * dist];
      } else {
        const prevDir = this._normalize([start[0] - prev[0], start[1] - prev[1]]);
        const nextDir = this._normalize([next[0] - end[0], next[1] - end[1]]);
        const dist = this._distance(start, end) / 3;
        control1 = [start[0] + prevDir[0] * dist, start[1] + prevDir[1] * dist];
        control2 = [end[0] + nextDir[0] * dist, end[1] + nextDir[1] * dist];
      }

      controls.push({ start, control1, control2, end });
    }

    return controls;
  }

  private _evaluateBezierCurve(controls: BezierControl[], resolution: number): [number, number][] {
    const curve: [number, number][] = [];

    for (const ctrl of controls) {
      for (let t = 0; t <= resolution; t++) {
        const u = t / resolution;
        const x = Math.pow(1 - u, 3) * ctrl.start[0] + 3 * Math.pow(1 - u, 2) * u * ctrl.control1[0] + 3 * (1 - u) * Math.pow(u, 2) * ctrl.control2[0] + Math.pow(u, 3) * ctrl.end[0];
        const y = Math.pow(1 - u, 3) * ctrl.start[1] + 3 * Math.pow(1 - u, 2) * u * ctrl.control1[1] + 3 * (1 - u) * Math.pow(u, 2) * ctrl.control2[1] + Math.pow(u, 3) * ctrl.end[1];
        curve.push([x, y]);
      }
    }

    return curve;
  }

  private _bsplineInterpolation(points: [number, number][], degree: number): [number, number][] {
    if (points.length < degree + 1) return points;

    const n = points.length;
    const m = n + degree;
    const knots: number[] = [];

    for (let i = 0; i <= m; i++) {
      knots.push(i < degree ? 0 : i <= n ? i - degree : n);
    }

    const result: [number, number][] = [];
    const samples = n * 10;

    for (let i = 0; i <= samples; i++) {
      const t = degree + (n - degree) * (i / samples);
      let x = 0, y = 0;

      for (let j = 0; j < n; j++) {
        const basis = this._bsplineBasis(j, degree, t, knots);
        x += basis * points[j][0];
        y += basis * points[j][1];
      }

      result.push([x, y]);
    }

    return result;
  }

  private _bsplineBasis(i: number, degree: number, t: number, knots: number[]): number {
    if (degree === 0) {
      return t >= knots[i] && t < knots[i + 1] ? 1 : 0;
    }

    const denom1 = knots[i + degree] - knots[i];
    const denom2 = knots[i + degree + 1] - knots[i + 1];

    let term1 = 0;
    if (denom1 !== 0) {
      term1 = ((t - knots[i]) / denom1) * this._bsplineBasis(i, degree - 1, t, knots);
    }

    let term2 = 0;
    if (denom2 !== 0) {
      term2 = ((knots[i + degree + 1] - t) / denom2) * this._bsplineBasis(i + 1, degree - 1, t, knots);
    }

    return term1 + term2;
  }

  public toPacket(): DataPacket<{
    paths: number;
    configs: number;
    planners: number;
    history: string[];
  }> {
    return {
      id: `pathplan-${Date.now()}-${this._counter}`,
      payload: {
        paths: this._paths.length,
        configs: this._configs.length,
        planners: this._planners.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['robotics', 'path_planning', 'result'],
        priority: 0.85,
        phase: 'planning',
      },
    };
  }

  public reset(): void {
    this._paths = [];
    this._configs = [];
    this._planners.clear();
    this._history = [];
    this._counter = 0;
    this._grid = [];
    this._rrtNodes.clear();
  }
}