/**
 * 梦境编译器：将日间残余信息编译为可执行幻想代码。
 * 日间残留信息被作为"梦境源"喂入编译器，编译出可执行的
 * 幻想代码；这些代码可在梦境运行时执行但通常不进入正式产物。
 */

export interface DayResidue {
  id: string;
  content: string;
  emotionalCharge: number;
  collectedAt: number;
}

export interface DreamCode {
  id: string;
  source: string;
  body: string;
  executable: boolean;
  surrealism: number;
  compiledAt: number;
}

export class DreamCompiler {
  private _residue: DayResidue[] = [];
  private _compiled: DreamCode[] = [];
  private _surrealismTarget: number = 0.5;

  /** 收集一条日间残余信息。 */
  ingestResidue(content: string, emotionalCharge: number): DayResidue {
    const r: DayResidue = {
      id: `residue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content,
      emotionalCharge,
      collectedAt: Date.now(),
    };
    this._residue.push(r);
    return r;
  }

  /** 把残余编译为幻想代码。 */
  compile(): DreamCode {
    const fragments = this._residue
      .sort((a, b) => b.emotionalCharge - a.emotionalCharge)
      .slice(0, 5)
      .map(r => `// ${r.content}`);
    const body = fragments.join('\n');
    const surrealism = this._residue.reduce((s, r) => s + r.emotionalCharge, 0) / Math.max(1, this._residue.length);
    const code: DreamCode = {
      id: `dream-${Date.now()}`,
      source: fragments.join(' | '),
      body,
      executable: surrealism >= this._surrealismTarget,
      surrealism,
      compiledAt: Date.now(),
    };
    this._compiled.push(code);
    return code;
  }

  /** 在梦境运行时执行已编译的幻想代码。 */
  execute(dreamId: string): { ran: boolean; output: string } {
    const code = this._compiled.find(c => c.id === dreamId);
    if (!code || !code.executable) return { ran: false, output: '' };
    const lines = code.body.split('\n').filter(Boolean);
    return { ran: true, output: lines.map(l => l.replace('// ', '')).join(' ') };
  }

  /** 验证幻想代码是否符合梦境逻辑（非真实逻辑）。 */
  validate(dreamId: string): boolean {
    const code = this._compiled.find(c => c.id === dreamId);
    if (!code) return false;
    code.executable = code.surrealism >= this._surrealismTarget;
    return code.executable;
  }

  purge(): number {
    const n = this._residue.length;
    this._residue = [];
    return n;
  }

  getDreams(): DreamCode[] {
    return [...this._compiled];
  }

  get residueCount(): number {
    return this._residue.length;
  }

  setSurrealismTarget(target: number): void {
    this._surrealismTarget = Math.max(0, Math.min(1, target));
  }
}
