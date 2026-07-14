export interface ArchitectureSnapshot {
  id: string;
  capturedAt: number;
  modules: string[];
  state: Record<string, unknown>;
}

export interface ThirdPerspectiveView {
  id: string;
  snapshotId: string;
  observer: string;
  observations: string[];
  reconstructedAt: number;
}

export interface ReconstructionPlan {
  id: string;
  viewId: string;
  steps: string[];
  applied: boolean;
}

interface DepMatrix { modules: string[]; matrix: number[][]; }
interface Perspective { rotation: number; elevation: number; distance: number; }

export class EkstasisEngine {
  private _snapshots: Map<string, ArchitectureSnapshot> = new Map();
  private _views: Map<string, ThirdPerspectiveView> = new Map();
  private _plans: ReconstructionPlan[] = [];
  private _depMatrices: Map<string, DepMatrix> = new Map();
  private _idCounter = 0;
  private _inEkstasis = false;
  private _ekstasisDepth = 0;
  private _maxDepth = 3;
  private _perspStack: Perspective[] = [];

  enterEkstasis(modules: string[], state: Record<string, unknown>): ArchitectureSnapshot {
    if (this._ekstasisDepth >= this._maxDepth) throw new Error('Max ekstasis depth exceeded');
    this._inEkstasis = true;
    this._ekstasisDepth++;
    this._perspStack.push({
      rotation: this._ekstasisDepth * 0.618,
      elevation: Math.sin(this._ekstasisDepth * 0.5) * 0.5,
      distance: 1 + this._ekstasisDepth * 0.3,
    });
    const id = `snap-${++this._idCounter}-${Date.now()}`;
    const snapshot: ArchitectureSnapshot = { id, capturedAt: Date.now(), modules: [...modules], state: { ...state } };
    this._snapshots.set(id, snapshot);
    this._buildDepMatrix(id, modules, state);
    return snapshot;
  }

  observe(snapshotId: string, observer: string): ThirdPerspectiveView {
    const snapshot = this._snapshots.get(snapshotId);
    if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);
    if (!this._inEkstasis) throw new Error('Must be in ekstasis to observe');
    const dep = this._depMatrices.get(snapshotId);
    const persp = this._perspStack[this._ekstasisDepth - 1];
    const view: ThirdPerspectiveView = {
      id: `view-${++this._idCounter}-${Date.now()}`,
      snapshotId, observer,
      observations: this._genObservations(snapshot, dep, persp),
      reconstructedAt: Date.now(),
    };
    this._views.set(view.id, view);
    return view;
  }

  reconstruct(viewId: string): ReconstructionPlan {
    const view = this._views.get(viewId);
    if (!view) throw new Error(`View not found: ${viewId}`);
    const dep = this._depMatrices.get(view.snapshotId);
    const plan: ReconstructionPlan = {
      id: `plan-${++this._idCounter}-${Date.now()}`,
      viewId, steps: this._buildReconSteps(view, dep), applied: false,
    };
    this._plans.push(plan);
    return plan;
  }

  applyPlan(planId: string): boolean {
    const plan = this._plans.find(p => p.id === planId);
    if (!plan || plan.applied) return false;
    plan.applied = true;
    return true;
  }

  exitEkstasis(): void {
    if (this._ekstasisDepth > 0) { this._ekstasisDepth--; this._perspStack.pop(); }
    if (this._ekstasisDepth === 0) this._inEkstasis = false;
  }

  forceExit(): void {
    this._ekstasisDepth = 0;
    this._inEkstasis = false;
    this._perspStack = [];
  }

  setMaxDepth(d: number): void {
    if (d < 1) throw new Error('Max depth must be at least 1');
    this._maxDepth = d;
  }

  getSnapshot(id: string): ArchitectureSnapshot | undefined { return this._snapshots.get(id); }
  getView(id: string): ThirdPerspectiveView | undefined { return this._views.get(id); }
  get plans(): ReconstructionPlan[] { return [...this._plans]; }
  get inEkstasis(): boolean { return this._inEkstasis; }
  get ekstasisDepth(): number { return this._ekstasisDepth; }
  get maxDepth(): number { return this._maxDepth; }
  get snapshotCount(): number { return this._snapshots.size; }

  private _buildDepMatrix(snapshotId: string, modules: string[], state: Record<string, unknown>): void {
    const n = modules.length;
    const matrix: number[][] = [];
    const stateKeys = Object.keys(state);
    const modTokens = modules.map(m => new Set(m.toLowerCase().split(/[-_]/)));
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) { matrix[i][j] = 0; continue; }
        let c = 0;
        for (const key of stateKeys) {
          const val = state[key];
          if (typeof val === 'string') { if (val.includes(modules[i]) && val.includes(modules[j])) c += 0.2; }
          else if (Array.isArray(val)) {
            const a = val.some((v: unknown) => typeof v === 'string' && v.includes(modules[i]));
            const b = val.some((v: unknown) => typeof v === 'string' && v.includes(modules[j]));
            if (a && b) c += 0.15;
          }
        }
        const sa = modTokens[i], sb = modTokens[j];
        let cmn = 0;
        for (const t of sa) if (sb.has(t)) cmn++;
        const ns = (sa.size + sb.size - cmn) === 0 ? 1 : cmn / (sa.size + sb.size - cmn);
        matrix[i][j] = Math.min(0.95, c + ns * 0.3 + Math.random() * 0.1);
      }
    }
    this._depMatrices.set(snapshotId, { modules, matrix });
  }

  private _topologicalEntropy(dep: DepMatrix): number {
    const n = dep.matrix.length;
    if (n === 0) return 0;
    let total = 0;
    const outW = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { outW[i] += dep.matrix[i][j]; total += dep.matrix[i][j]; }
    if (total === 0) return 0;
    let h = 0;
    for (let i = 0; i < n; i++) if (outW[i] > 0) { const p = outW[i] / total; h -= p * Math.log2(p); }
    return h / Math.log2(n);
  }

  private _perspectiveTransform(dep: DepMatrix, persp: Perspective): number[][] {
    const n = dep.matrix.length;
    const out: number[][] = [];
    const cosR = Math.cos(persp.rotation), sinR = Math.sin(persp.rotation);
    const cosE = Math.cos(persp.elevation), sinE = Math.sin(persp.elevation);
    const sc = 1 / persp.distance;
    for (let i = 0; i < n; i++) {
      out[i] = [];
      for (let j = 0; j < n; j++) {
        const dx = (j - n / 2) / (n / 2 || 1), dy = (i - n / 2) / (n / 2 || 1);
        const rx = dx * cosR - dy * sinR, ry = dx * sinR + dy * cosR;
        const ey = ry * cosE - 0.3 * sinE;
        const depth = 1 / (1 + Math.abs(ey) * 0.5);
        out[i][j] = Math.max(0, Math.min(1, dep.matrix[i][j] * sc * depth * (0.7 + 0.3 * Math.cos(rx * 0.5))));
      }
    }
    return out;
  }

  private _eigenCentrality(matrix: number[][]): number[] {
    const n = matrix.length;
    if (n === 0) return [];
    let vec = new Array(n).fill(1 / Math.sqrt(n));
    for (let iter = 0; iter < 40; iter++) {
      const next = new Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) next[i] += matrix[j][i] * vec[j];
      const norm = Math.sqrt(next.reduce((s, v) => s + v * v, 0));
      if (norm < 1e-9) break;
      for (let i = 0; i < n; i++) next[i] /= norm;
      let diff = 0;
      for (let i = 0; i < n; i++) diff += Math.abs(next[i] - vec[i]);
      vec = next;
      if (diff < 1e-6) break;
    }
    const max = Math.max(...vec);
    return max > 0 ? vec.map(v => v / max) : vec;
  }

  private _genObservations(snapshot: ArchitectureSnapshot, dep: DepMatrix | undefined, persp: Perspective): string[] {
    const obs: string[] = [];
    const n = snapshot.modules.length;
    obs.push(`architecture has ${n} modules`);
    obs.push(`state contains ${Object.keys(snapshot.state).length} keys`);
    if (!dep) return obs;
    const entropy = this._topologicalEntropy(dep);
    obs.push(`topological entropy: ${entropy.toFixed(3)} (normalized)`);
    const transformed = this._perspectiveTransform(dep, persp);
    const cent = this._eigenCentrality(transformed);
    const sorted = cent.map((c, i) => ({ m: dep.modules[i], c })).sort((a, b) => b.c - a.c);
    obs.push(`perspective rot: ${persp.rotation.toFixed(2)}rad, elev: ${persp.elevation.toFixed(2)}`);
    for (let i = 0; i < Math.min(3, sorted.length); i++) obs.push(`module "${sorted[i].m}" centrality ${sorted[i].c.toFixed(3)}`);
    if (entropy > 0.7) obs.push('architecture is highly distributed');
    else if (entropy < 0.3) obs.push('architecture is strongly centralized');
    if (n > 5 && sorted[0].c > sorted[n - 1].c * 3) obs.push('hub-and-spoke pattern detected');
    const avg = transformed.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0) / (n * n || 1);
    obs.push(`avg coupling from this perspective: ${avg.toFixed(3)}`);
    return obs;
  }

  private _topoSort(dep: DepMatrix): string[] {
    const n = dep.matrix.length;
    const inDeg = new Array(n).fill(0);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (dep.matrix[i][j] > 0.3) inDeg[j]++;
    const order: string[] = [];
    const visited = new Set<number>();
    while (visited.size < n) {
      let minI = -1, minD = Infinity;
      for (let i = 0; i < n; i++) if (!visited.has(i) && inDeg[i] < minD) { minD = inDeg[i]; minI = i; }
      if (minI === -1) break;
      visited.add(minI);
      order.push(dep.modules[minI]);
      for (let j = 0; j < n; j++) if (dep.matrix[minI][j] > 0.3) inDeg[j]--;
    }
    return order;
  }

  private _buildReconSteps(view: ThirdPerspectiveView, dep: DepMatrix | undefined): string[] {
    const steps: string[] = [`deconstruct view from observer "${view.observer}"`];
    let idx = 1;
    for (const o of view.observations) {
      if (o.includes('centrality') && o.includes('module')) {
        steps.push(`step ${idx++}: reprioritize ${o.match(/"([^"]+)"/)?.[1] || 'unknown'}`);
      }
    }
    if (dep) {
      const sorted = this._topoSort(dep);
      steps.push(`step ${idx++}: rewire deps in topological order`);
      for (let i = 0; i < Math.min(2, sorted.length); i++) steps.push(`step ${idx++}: isolate ${sorted[i]} boundary`);
    }
    steps.push(`step ${idx++}: reintegrate state from third perspective`);
    steps.push(`step ${idx++}: verify architectural coherence`);
    return steps;
  }
}
