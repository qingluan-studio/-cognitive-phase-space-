/**
 * 自然发生：从注释、废弃变量中随机组合出可运行代码。
 * 从代码库的边角料（注释、废弃变量、未用片段）中随机抽取，
 * 拼接尝试编译，验证通过则视为自然发生的新代码。
 */

export interface ScrapItem {
  id: string;
  kind: 'comment' | 'deadVariable' | 'unusedFragment';
  raw: string;
  source: string;
}

export interface GeneratedCode {
  id: string;
  body: string;
  runnable: boolean;
  sources: string[];
  generatedAt: number;
}

export class SpontaneousGeneration {
  private _scrap: ScrapItem[] = [];
  private _generated: GeneratedCode[] = [];
  private _compiler: ((code: string) => boolean) | null = null;

  /** 收集边角料入库。 */
  gather(item: ScrapItem): void {
    this._scrap.push(item);
  }

  /** 从边角料中随机组合一段候选代码。 */
  combine(count: number = 5): GeneratedCode {
    const shuffled = [...this._scrap].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(count, shuffled.length));
    const body = picked.map(s => s.raw).join('\n');
    const code: GeneratedCode = {
      id: `gen-${Date.now()}`,
      body,
      runnable: false,
      sources: picked.map(s => s.source),
      generatedAt: Date.now(),
    };
    this._generated.push(code);
    return code;
  }

  /** 用注入的编译器尝试编译候选代码。 */
  attemptCompile(codeId: string): boolean {
    const code = this._generated.find(c => c.id === codeId);
    if (!code || !this._compiler) return false;
    code.runnable = this._compiler(code.body);
    return code.runnable;
  }

  /** 验证生成的代码是否结构合法。 */
  validate(codeId: string): boolean {
    const code = this._generated.find(c => c.id === codeId);
    if (!code) return false;
    const balanced = this._checkBalance(code.body);
    code.runnable = balanced;
    return balanced;
  }

  /** 拯救不可运行代码：剔除坏片段再试。 */
  salvage(codeId: string): GeneratedCode | null {
    const code = this._generated.find(c => c.id === codeId);
    if (!code) return null;
    const lines = code.body.split('\n').filter(l => !l.includes('TODO') && !l.includes('FIXME'));
    const salvaged: GeneratedCode = {
      id: `salvage-${Date.now()}`,
      body: lines.join('\n'),
      runnable: false,
      sources: code.sources,
      generatedAt: Date.now(),
    };
    this._generated.push(salvaged);
    return salvaged;
  }

  setCompiler(fn: (code: string) => boolean): void {
    this._compiler = fn;
  }

  getGenerated(): GeneratedCode[] {
    return [...this._generated];
  }

  get runnableCount(): number {
    return this._generated.filter(c => c.runnable).length;
  }

  private _checkBalance(code: string): boolean {
    const stack: string[] = [];
    const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    for (const ch of code) {
      if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
      else if (ch === ')' || ch === ']' || ch === '}') {
        if (stack.pop() !== pairs[ch]) return false;
      }
    }
    return stack.length === 0;
  }
}
