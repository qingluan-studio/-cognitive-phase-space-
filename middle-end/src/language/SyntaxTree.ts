export interface TreeNode {
  label: string;
  children: TreeNode[];
  depth: number;
  span: { start: number; end: number };
}

export interface ParseResult {
  root: TreeNode;
  depth: number;
  nodeCount: number;
  branchingFactor: number;
}

export class SyntaxTree {
  private _root: TreeNode | null;
  private _rules: Map<string, string[][]>;
  private _history: ParseResult[];
  private _terminals: Set<string>;

  constructor() {
    this._root = null;
    this._rules = new Map();
    this._history = [];
    this._terminals = new Set();
  }

  get ruleCount(): number { return this._rules.size; }
  get history(): ParseResult[] { return this._history; }
  get root(): TreeNode | null { return this._root; }

  public addRule(nonTerminal: string, expansions: string[][]): void {
    this._rules.set(nonTerminal, expansions);
  }

  public addTerminal(token: string): void {
    this._terminals.add(token);
  }

  public generateTree(symbol: string, depth: number = 0, maxDepth: number = 5): TreeNode {
    const expansions = this._rules.get(symbol);
    const node: TreeNode = {
      label: symbol,
      children: [],
      depth,
      span: { start: 0, end: 0 }
    };
    if (!expansions || depth >= maxDepth || this._terminals.has(symbol)) {
      return node;
    }
    const chosen = expansions[Math.floor(Math.random() * expansions.length)];
    for (const childSymbol of chosen) {
      const child = this.generateTree(childSymbol, depth + 1, maxDepth);
      child.depth = depth + 1;
      node.children.push(child);
    }
    return node;
  }

  public parseSentence(tokens: string[], grammar: Map<string, string[][]>): ParseResult | null {
    const chart: TreeNode[][][] = Array.from({ length: tokens.length + 1 }, () =>
      Array.from({ length: tokens.length + 1 }, () => [])
    );
    for (let i = 0; i < tokens.length; i++) {
      for (const [lhs, rhsList] of grammar) {
        for (const rhs of rhsList) {
          if (rhs.length === 1 && rhs[0] === tokens[i]) {
            chart[i][i + 1].push({
              label: lhs,
              children: [{ label: tokens[i], children: [], depth: 0, span: { start: i, end: i + 1 } }],
              depth: 0,
              span: { start: i, end: i + 1 }
            });
          }
        }
      }
    }
    for (let length = 2; length <= tokens.length; length++) {
      for (let start = 0; start <= tokens.length - length; start++) {
        const end = start + length;
        for (let mid = start + 1; mid < end; mid++) {
          for (const [lhs, rhsList] of grammar) {
            for (const rhs of rhsList) {
              if (rhs.length === 2) {
                for (const left of chart[start][mid]) {
                  if (left.label === rhs[0]) {
                    for (const right of chart[mid][end]) {
                      if (right.label === rhs[1]) {
                        chart[start][end].push({
                          label: lhs,
                          children: [left, right],
                          depth: Math.max(left.depth, right.depth) + 1,
                          span: { start, end }
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    const roots = chart[0][tokens.length].filter(n => n.label === 'S');
    if (roots.length === 0) return null;
    const root = roots[0];
    this._root = root;
    const result: ParseResult = {
      root,
      depth: this.computeDepth(root),
      nodeCount: this.countNodes(root),
      branchingFactor: this.computeBranchingFactor(root)
    };
    this._history.push(result);
    return result;
  }

  public computeDepth(node: TreeNode): number {
    if (node.children.length === 0) return node.depth;
    return Math.max(...node.children.map(c => this.computeDepth(c)));
  }

  public countNodes(node: TreeNode): number {
    if (node.children.length === 0) return 1;
    return 1 + node.children.reduce((sum, c) => sum + this.countNodes(c), 0);
  }

  public computeBranchingFactor(node: TreeNode): number {
    const nodes = this._flatten(node);
    const internals = nodes.filter(n => n.children.length > 0);
    if (internals.length === 0) return 0;
    return internals.reduce((sum, n) => sum + n.children.length, 0) / internals.length;
  }

  private _flatten(node: TreeNode): TreeNode[] {
    const result = [node];
    for (const child of node.children) {
      result.push(...this._flatten(child));
    }
    return result;
  }

  public findConstituents(node: TreeNode, label: string): TreeNode[] {
    const result: TreeNode[] = [];
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current.label === label) result.push(current);
      for (const child of current.children) stack.push(child);
    }
    return result;
  }

  public computeConstituentEntropy(node: TreeNode): number {
    const counts = new Map<string, number>();
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop()!;
      counts.set(current.label, (counts.get(current.label) || 0) + 1);
      for (const child of current.children) stack.push(child);
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    let entropy = 0;
    for (const count of counts.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public transformToChomskyNormalForm(grammar: Map<string, string[][]>): Map<string, string[][]> {
    const newGrammar = new Map<string, string[][]>();
    let newSymbolCount = 0;
    for (const [lhs, rhsList] of grammar) {
      newGrammar.set(lhs, []);
      for (const rhs of rhsList) {
        if (rhs.length <= 2) {
          newGrammar.get(lhs)!.push([...rhs]);
        } else {
          let currentLHS = lhs;
          for (let i = 0; i < rhs.length - 2; i++) {
            const newSym = `X${newSymbolCount++}`;
            newGrammar.get(currentLHS)!.push([rhs[i], newSym]);
            newGrammar.set(newSym, []);
            currentLHS = newSym;
          }
          newGrammar.get(currentLHS)!.push([rhs[rhs.length - 2], rhs[rhs.length - 1]]);
        }
      }
    }
    return newGrammar;
  }

  public computeTreeEditDistance(a: TreeNode, b: TreeNode): number {
    if (a.label !== b.label) return 1;
    if (a.children.length === 0 && b.children.length === 0) return 0;
    const m = a.children.length;
    const n = b.children.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + this.computeTreeEditDistance(a.children[i - 1], b.children[j - 1])
        );
      }
    }
    return dp[m][n];
  }

  public generateSentence(node: TreeNode): string {
    if (node.children.length === 0) return node.label;
    return node.children.map(c => this.generateSentence(c)).join(' ');
  }

  public reset(): void {
    this._root = null;
    this._rules.clear();
    this._history = [];
    this._terminals.clear();
  }

  public exportTree(node: TreeNode): TreeNode {
    return {
      label: node.label,
      children: node.children.map(c => this.exportTree(c)),
      depth: node.depth,
      span: { ...node.span }
    };
  }
}
