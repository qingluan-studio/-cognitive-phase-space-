/**
 * 伤痕调试器：不修bug，将其固化为免疫伤疤秒杀同类。
 * 检测到的 bug 不被修复，而是被翻译为"伤疤"特征写入免疫系统，
 * 当同类 bug 再次出现时被立刻秒杀（拒绝执行）。
 */

export interface BugSignature {
  id: string;
  pattern: string;
  stack: string;
  severity: number;
}

export interface Scar {
  id: string;
  signature: BugSignature;
  immunizedAt: number;
  killCount: number;
}

export interface ImmunityReport {
  totalScars: number;
  totalKills: number;
  immunePatterns: string[];
}

export class ScarDebugger {
  private _scars: Map<string, Scar> = new Map();
  private _detected: BugSignature[] = [];
  private _killCount: number = 0;

  /** 识别一个 bug，但不修复。 */
  identify(signature: BugSignature): boolean {
    this._detected.push(signature);
    return this._matchesScar(signature);
  }

  /** 把 bug 固化为不可擦除的免疫伤疤。 */
  solidify(signature: BugSignature): Scar {
    const scar: Scar = {
      id: `scar-${signature.id}`,
      signature,
      immunizedAt: Date.now(),
      killCount: 0,
    };
    this._scars.set(scar.id, scar);
    return scar;
  }

  /** 用伤疤库免疫当前输入：命中则秒杀。 */
  immunize(input: { pattern: string; stack: string }): { killed: boolean; scarId: string | null } {
    for (const scar of this._scars.values()) {
      if (
        scar.signature.pattern === input.pattern ||
        input.stack.includes(scar.signature.stack)
      ) {
        scar.killCount++;
        this._killCount++;
        return { killed: true, scarId: scar.id };
      }
    }
    return { killed: false, scarId: null };
  }

  /** 检测输入是否命中已有伤疤。 */
  detectSimilar(input: { pattern: string; stack: string }): Scar | null {
    for (const scar of this._scars.values()) {
      if (this._similarity(scar.signature.pattern, input.pattern) > 0.7) return scar;
    }
    return null;
  }

  getImmunity(): ImmunityReport {
    return {
      totalScars: this._scars.size,
      totalKills: this._killCount,
      immunePatterns: [...this._scars.values()].map(s => s.signature.pattern),
    };
  }

  getScars(): Scar[] {
    return [...this._scars.values()];
  }

  get detectedCount(): number {
    return this._detected.length;
  }

  private _matchesScar(signature: BugSignature): boolean {
    for (const scar of this._scars.values()) {
      if (scar.signature.pattern === signature.pattern) return true;
    }
    return false;
  }

  private _similarity(a: string, b: string): number {
    if (a === b) return 1;
    const setA = new Set(a.split(''));
    const setB = new Set(b.split(''));
    let common = 0;
    for (const c of setA) if (setB.has(c)) common++;
    return common / Math.max(setA.size, setB.size);
  }
}
