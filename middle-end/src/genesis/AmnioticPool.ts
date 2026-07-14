/**
 * 羊水池：孵化数百微AI，优胜者基因并入母体。
 * 在受控的羊水环境中孵化大量微型AI胚胎，进行竞争评估，
 * 优胜者的特征基因被并入母体，劣者被淘汰。
 */

export interface Embryo {
  id: string;
  genome: Record<string, unknown>;
  fitness: number;
  age: number;
  alive: boolean;
}

export interface Champion {
  embryoId: string;
  genome: Record<string, unknown>;
  mergedAt: number;
}

export interface MaternalGenome {
  genes: Record<string, unknown>;
  generation: number;
}

export class AmnioticPool {
  private _embryos: Map<string, Embryo> = new Map();
  private _champions: Champion[] = [];
  private _maternal: MaternalGenome = { genes: {}, generation: 0 };
  private _maxPopulation: number = 500;
  private _incubationTemp: number = 0.5;

  /** 投放新的胚胎入池。 */
  spawn(genome: Record<string, unknown>): Embryo {
    if (this._embryos.size >= this._maxPopulation) {
      this.cull(this._maxPopulation / 2);
    }
    const embryo: Embryo = {
      id: `embryo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      genome,
      fitness: 0,
      age: 0,
      alive: true,
    };
    this._embryos.set(embryo.id, embryo);
    return embryo;
  }

  /** 孵化一个周期：所有胚胎年龄增长并评估。 */
  incubate(evaluator: (e: Embryo) => number): number {
    let aliveCount = 0;
    for (const e of this._embryos.values()) {
      if (!e.alive) continue;
      e.age++;
      e.fitness = evaluator(e);
      if (e.age > 50 || e.fitness < 0.05) e.alive = false;
      else aliveCount++;
    }
    return aliveCount;
  }

  /** 胚胎间竞争：按适应度排序保留前 N。 */
  compete(survivorCount: number): Embryo[] {
    const alive = [...this._embryos.values()].filter(e => e.alive);
    alive.sort((a, b) => b.fitness - a.fitness);
    const survivors = alive.slice(0, survivorCount);
    for (const e of alive.slice(survivorCount)) e.alive = false;
    return survivors;
  }

  /** 把优胜者基因并入母体。 */
  merge(championId: string): Champion | null {
    const embryo = this._embryos.get(championId);
    if (!embryo || !embryo.alive) return null;
    this._maternal.genes = { ...this._maternal.genes, ...embryo.genome };
    this._maternal.generation++;
    const champion: Champion = {
      embryoId: championId,
      genome: { ...embryo.genome },
      mergedAt: Date.now(),
    };
    this._champions.push(champion);
    embryo.alive = false;
    return champion;
  }

  cull(targetPopulation: number): number {
    const alive = [...this._embryos.values()].filter(e => e.alive);
    if (alive.length <= targetPopulation) return 0;
    alive.sort((a, b) => a.fitness - b.fitness);
    const toCull = alive.length - targetPopulation;
    for (let i = 0; i < toCull; i++) alive[i].alive = false;
    return toCull;
  }

  get maternalGenome(): MaternalGenome {
    return { ...this._maternal };
  }

  getChampions(): Champion[] {
    return [...this._champions];
  }

  get population(): number {
    return [...this._embryos.values()].filter(e => e.alive).length;
  }

  setTemperature(temp: number): void {
    this._incubationTemp = Math.max(0, Math.min(1, temp));
  }
}
