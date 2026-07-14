/**
 * 远程创世种子：跨进程投射可自生长的代码胚胎。
 * 把一个可自生长的代码胚胎打包，跨进程投射到远程运行时，
 * 在远程环境中生根发芽，长成独立的运行单元。
 */

export interface CodeEmbryo {
  id: string;
  genome: string;
  nutrients: Record<string, unknown>;
  growthStage: number;
  viability: number;
}

export type ProjectionStatus = 'packed' | 'projected' | 'germinating' | 'grown' | 'dead';

export interface ProjectionTarget {
  processId: string;
  endpoint: string;
  available: boolean;
}

export class TelepoieticSeed {
  private _embryo: CodeEmbryo | null = null;
  private _status: ProjectionStatus = 'packed';
  private _targets: Map<string, ProjectionTarget> = new Map();
  private _projections: { embryoId: string; target: string; projectedAt: number }[] = [];

  /** 打包一个可自生长的代码胚胎。 */
  pack(genome: string, nutrients: Record<string, unknown>): CodeEmbryo {
    const embryo: CodeEmbryo = {
      id: `embryo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      genome,
      nutrients,
      growthStage: 0,
      viability: 1,
    };
    this._embryo = embryo;
    this._status = 'packed';
    return embryo;
  }

  /** 注册一个可投射的远程目标。 */
  registerTarget(target: ProjectionTarget): void {
    this._targets.set(target.processId, target);
  }

  /** 把胚胎投射到远程目标。 */
  project(targetId: string): boolean {
    if (!this._embryo) return false;
    const target = this._targets.get(targetId);
    if (!target || !target.available) return false;
    this._status = 'projected';
    this._projections.push({
      embryoId: this._embryo.id,
      target: targetId,
      projectedAt: Date.now(),
    });
    return true;
  }

  /** 在远程目标处开始发芽。 */
  germinate(): boolean {
    if (this._status !== 'projected' || !this._embryo) return false;
    this._status = 'germinating';
    this._embryo.growthStage = 1;
    return true;
  }

  /** 让胚胎在远程持续生长一个阶段。 */
  grow(): CodeEmbryo | null {
    if (!this._embryo || this._status !== 'germinating') return null;
    this._embryo.growthStage++;
    this._embryo.viability = Math.max(0, this._embryo.viability - 0.05);
    if (this._embryo.growthStage >= 5) this._status = 'grown';
    if (this._embryo.viability <= 0) this._status = 'dead';
    return this._embryo;
  }

  /** 与母体分离，成为独立运行单元。 */
  detach(): boolean {
    if (this._status !== 'grown') return false;
    this._embryo = null;
    this._status = 'packed';
    return true;
  }

  getEmbryo(): CodeEmbryo | null {
    return this._embryo;
  }

  get status(): ProjectionStatus {
    return this._status;
  }

  get projections(): { embryoId: string; target: string; projectedAt: number }[] {
    return [...this._projections];
  }

  getTargets(): ProjectionTarget[] {
    return [...this._targets.values()];
  }
}
