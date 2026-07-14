/** 出神引擎 - 暂时脱离自身架构，以第三视角重建逻辑 */

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

export class EkstasisEngine {
  private _snapshots: Map<string, ArchitectureSnapshot> = new Map();
  private _views: Map<string, ThirdPerspectiveView> = new Map();
  private _plans: ReconstructionPlan[] = [];
  private _idCounter = 0;
  private _inEkstasis = false;
  private _ekstasisDepth = 0;
  private _maxDepth = 3;

  enterEkstasis(modules: string[], state: Record<string, unknown>): ArchitectureSnapshot {
    if (this._ekstasisDepth >= this._maxDepth) {
      throw new Error('Max ekstasis depth exceeded');
    }
    this._inEkstasis = true;
    this._ekstasisDepth++;
    const id = `snap-${++this._idCounter}-${Date.now()}`;
    const snapshot: ArchitectureSnapshot = {
      id,
      capturedAt: Date.now(),
      modules: [...modules],
      state: { ...state },
    };
    this._snapshots.set(id, snapshot);
    return snapshot;
  }

  observe(snapshotId: string, observer: string): ThirdPerspectiveView {
    const snapshot = this._snapshots.get(snapshotId);
    if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);
    if (!this._inEkstasis) throw new Error('Must be in ekstasis to observe');
    const observations = this._generateObservations(snapshot);
    const view: ThirdPerspectiveView = {
      id: `view-${++this._idCounter}-${Date.now()}`,
      snapshotId,
      observer,
      observations,
      reconstructedAt: Date.now(),
    };
    this._views.set(view.id, view);
    return view;
  }

  reconstruct(viewId: string): ReconstructionPlan {
    const view = this._views.get(viewId);
    if (!view) throw new Error(`View not found: ${viewId}`);
    const steps = view.observations.map((obs, i) => `rebuild[${i}]: ${obs}`);
    const plan: ReconstructionPlan = {
      id: `plan-${++this._idCounter}-${Date.now()}`,
      viewId,
      steps,
      applied: false,
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
    if (this._ekstasisDepth > 0) this._ekstasisDepth--;
    if (this._ekstasisDepth === 0) this._inEkstasis = false;
  }

  forceExit(): void {
    this._ekstasisDepth = 0;
    this._inEkstasis = false;
  }

  setMaxDepth(d: number): void {
    if (d < 1) throw new Error('Max depth must be at least 1');
    this._maxDepth = d;
  }

  getSnapshot(id: string): ArchitectureSnapshot | undefined {
    return this._snapshots.get(id);
  }

  getView(id: string): ThirdPerspectiveView | undefined {
    return this._views.get(id);
  }

  get plans(): ReconstructionPlan[] {
    return [...this._plans];
  }

  get inEkstasis(): boolean {
    return this._inEkstasis;
  }

  get ekstasisDepth(): number {
    return this._ekstasisDepth;
  }

  get maxDepth(): number {
    return this._maxDepth;
  }

  get snapshotCount(): number {
    return this._snapshots.size;
  }

  private _generateObservations(snapshot: ArchitectureSnapshot): string[] {
    const observations: string[] = [];
    observations.push(`architecture has ${snapshot.modules.length} modules`);
    observations.push(`state contains ${Object.keys(snapshot.state).length} keys`);
    for (const mod of snapshot.modules) {
      observations.push(`module "${mod}" appears externally coupled`);
    }
    if (snapshot.modules.length > 5) {
      observations.push('architecture may be over-modularized');
    }
    return observations;
  }
}
