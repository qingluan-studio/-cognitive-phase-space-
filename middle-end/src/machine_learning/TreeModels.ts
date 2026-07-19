import { DataPacket, PacketMeta } from '../shared/types';

/** Decision tree node. */
export interface TreeNode {
  id: string;
  feature: number;
  threshold: number;
  left: TreeNode | null;
  right: TreeNode | null;
  prediction: number;
  isLeaf: boolean;
  samples: number;
}

/** Decision tree summary. */
export interface DecisionTree {
  id: string;
  root: TreeNode | null;
  depth: number;
  splits: number;
  impurity: number;
  criterion: SplitCriterion;
}

/** Split criterion identifier. */
export type SplitCriterion = 'gini' | 'entropy' | 'mse';

/** Internal training record for ensemble methods. */
interface TreeRecord {
  treeId: string;
  depth: number;
  impurity: number;
  timestamp: number;
}

/** Forest (collection of trees). */
export interface Forest {
  id: string;
  trees: DecisionTree[];
  kind: 'random_forest' | 'gradient_boost' | 'xgboost';
}

export class TreeModels {
  private _trees: Map<string, DecisionTree> = new Map();
  private _nodes: TreeNode[] = [];
  private _history: TreeRecord[] = [];
  private _counter = 0;
  private _nodeCounter = 0;

  decisionTree(X: number[][], y: number[], maxDepth: number = 5, criterion: SplitCriterion = 'gini'): DecisionTree {
    const root = this._buildTree(X, y, 0, maxDepth, criterion);
    const tree: DecisionTree = {
      id: `tree-${++this._counter}-${Date.now().toString(36)}`,
      root,
      depth: this._treeDepth(root),
      splits: this._countSplits(root),
      impurity: this._rootImpurity(y, criterion),
      criterion,
    };
    this._trees.set(tree.id, tree);
    this._history.push({ treeId: tree.id, depth: tree.depth, impurity: tree.impurity, timestamp: Date.now() });
    return tree;
  }

  randomForest(X: number[][], y: number[], n: number = 10, maxDepth: number = 5): Forest {
    const trees: DecisionTree[] = [];
    for (let i = 0; i < n; i++) {
      const { Xs, ys } = this._bootstrap(X, y);
      trees.push(this.decisionTree(Xs, ys, maxDepth, 'gini'));
    }
    return { id: `forest-${Date.now().toString(36)}`, trees, kind: 'random_forest' };
  }

  gradientBoosting(X: number[][], y: number[], n: number = 10, lr: number = 0.1, maxDepth: number = 3): Forest {
    const trees: DecisionTree[] = [];
    let residual = [...y];
    for (let i = 0; i < n; i++) {
      const tree = this.decisionTree(X, residual, maxDepth, 'mse');
      const preds = X.map(row => this.predictTree(tree, row));
      residual = residual.map((r, idx) => r - lr * preds[idx]);
      trees.push(tree);
    }
    return { id: `gb-${Date.now().toString(36)}`, trees, kind: 'gradient_boost' };
  }

  xgboost(X: number[][], y: number[], params: { n: number; lr: number; maxDepth: number; lambda: number }): Forest {
    const trees: DecisionTree[] = [];
    let residual = [...y];
    for (let i = 0; i < params.n; i++) {
      const tree = this.decisionTree(X, residual, params.maxDepth, 'mse');
      const preds = X.map(row => this.predictTree(tree, row));
      residual = residual.map((r, idx) => r - params.lr * preds[idx] + params.lambda * preds[idx]);
      trees.push(tree);
    }
    return { id: `xgb-${Date.now().toString(36)}`, trees, kind: 'xgboost' };
  }

  gini(y: number[]): number {
    if (y.length === 0) return 0;
    const counts = new Map<number, number>();
    for (const v of y) counts.set(v, (counts.get(v) ?? 0) + 1);
    let sum = 0;
    for (const c of counts.values()) {
      const p = c / y.length;
      sum += p * p;
    }
    return 1 - sum;
  }

  entropy(y: number[]): number {
    if (y.length === 0) return 0;
    const counts = new Map<number, number>();
    for (const v of y) counts.set(v, (counts.get(v) ?? 0) + 1);
    let sum = 0;
    for (const c of counts.values()) {
      const p = c / y.length;
      sum -= p * Math.log2(p + 1e-12);
    }
    return sum;
  }

  informationGain(parent: number[], children: number[][]): number {
    const parentImp = this.gini(parent);
    const total = parent.length;
    let childImp = 0;
    for (const child of children) {
      childImp += (child.length / total) * this.gini(child);
    }
    return parentImp - childImp;
  }

  gainRatio(parent: number[], children: number[][]): number {
    const ig = this.informationGain(parent, children);
    const total = parent.length;
    let splitInfo = 0;
    for (const child of children) {
      const p = child.length / total;
      if (p > 0) splitInfo -= p * Math.log2(p + 1e-12);
    }
    return splitInfo === 0 ? 0 : ig / splitInfo;
  }

  bestSplit(X: number[][], y: number[], feature: number): { threshold: number; gain: number } {
    const values = X.map(row => row[feature]).sort((a, b) => a - b);
    let bestGain = -Infinity;
    let bestThreshold = values[0] ?? 0;
    for (let i = 1; i < values.length; i++) {
      const threshold = (values[i - 1] + values[i]) / 2;
      const left: number[] = [];
      const right: number[] = [];
      X.forEach((row, idx) => {
        if (row[feature] <= threshold) left.push(y[idx]);
        else right.push(y[idx]);
      });
      const gain = this.informationGain(y, [left, right]);
      if (gain > bestGain) {
        bestGain = gain;
        bestThreshold = threshold;
      }
    }
    return { threshold: bestThreshold, gain: bestGain };
  }

  prune(tree: DecisionTree, X_val: number[][], y_val: number[]): DecisionTree {
    if (!tree.root) return tree;
    const prunedRoot = this._pruneNode(tree.root, X_val, y_val);
    return { ...tree, root: prunedRoot, depth: this._treeDepth(prunedRoot), splits: this._countSplits(prunedRoot) };
  }

  featureImportance(tree: DecisionTree): number[] {
    const importance: number[] = [];
    if (!tree.root) return importance;
    const maxFeature = this._maxFeature(tree.root);
    for (let i = 0; i <= maxFeature; i++) importance[i] = 0;
    this._accumulateImportance(tree.root, importance);
    const total = importance.reduce((s, v) => s + v, 0);
    return total === 0 ? importance : importance.map(v => v / total);
  }

  predictTree(tree: DecisionTree, x: number[]): number {
    let node = tree.root;
    while (node && !node.isLeaf) {
      node = x[node.feature] <= node.threshold ? node.left : node.right;
    }
    return node ? node.prediction : 0;
  }

  predictForest(forest: Forest, x: number[]): number {
    const preds = forest.trees.map(t => this.predictTree(t, x));
    if (forest.kind === 'random_forest') {
      const counts = new Map<number, number>();
      for (const p of preds) counts.set(p, (counts.get(p) ?? 0) + 1);
      let best = preds[0] ?? 0;
      let bestCount = 0;
      for (const [k, v] of counts) if (v > bestCount) { best = k; bestCount = v; }
      return best;
    }
    return preds.reduce((s, v) => s + v, 0) / preds.length;
  }

  toPacket(): DataPacket<{ trees: Map<string, DecisionTree>; nodes: TreeNode[]; history: TreeRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['machine_learning', 'TreeModels'],
      priority: 1,
      phase: 'tree_models',
    };
    return {
      id: `tree-models-${Date.now().toString(36)}`,
      payload: { trees: this._trees, nodes: this._nodes, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._trees = new Map();
    this._nodes = [];
    this._history = [];
    this._counter = 0;
    this._nodeCounter = 0;
  }

  get treeCount(): number { return this._trees.size; }
  get nodeCount(): number { return this._nodes.length; }
  get historyCount(): number { return this._history.length; }

  private _buildTree(X: number[][], y: number[], depth: number, maxDepth: number, criterion: SplitCriterion): TreeNode | null {
    if (X.length === 0 || depth >= maxDepth) return null;
    const prediction = criterion === 'mse' ? this._mean(y) : this._mode(y);
    if (this._isPure(y) || depth === maxDepth - 1) {
      return this._leaf(prediction, X.length);
    }
    const features = X[0].length;
    let bestFeature = 0;
    let bestSplit = this.bestSplit(X, y, 0);
    for (let f = 1; f < features; f++) {
      const split = this.bestSplit(X, y, f);
      if (split.gain > bestSplit.gain) { bestSplit = split; bestFeature = f; }
    }
    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[bestFeature] <= bestSplit.threshold) leftIdx.push(idx);
      else rightIdx.push(idx);
    });
    if (leftIdx.length === 0 || rightIdx.length === 0) return this._leaf(prediction, X.length);
    const node = this._leaf(prediction, X.length);
    node.isLeaf = false;
    node.feature = bestFeature;
    node.threshold = bestSplit.threshold;
    node.left = this._buildTree(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), depth + 1, maxDepth, criterion);
    node.right = this._buildTree(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), depth + 1, maxDepth, criterion);
    this._nodes.push(node);
    return node;
  }

  private _leaf(prediction: number, samples: number): TreeNode {
    return {
      id: `node-${++this._nodeCounter}`,
      feature: -1,
      threshold: 0,
      left: null,
      right: null,
      prediction,
      isLeaf: true,
      samples,
    };
  }

  private _pruneNode(node: TreeNode, X_val: number[][], y_val: number[]): TreeNode {
    if (node.isLeaf) return node;
    const leftValIdx: number[] = [];
    const rightValIdx: number[] = [];
    X_val.forEach((row, idx) => {
      if (row[node.feature] <= node.threshold) leftValIdx.push(idx);
      else rightValIdx.push(idx);
    });
    if (node.left) node.left = this._pruneNode(node.left, leftValIdx.map(i => X_val[i]), leftValIdx.map(i => y_val[i]));
    if (node.right) node.right = this._pruneNode(node.right, rightValIdx.map(i => X_val[i]), rightValIdx.map(i => y_val[i]));
    const before = this._validationError(node, X_val, y_val);
    const after = this._leafError(node.prediction, y_val);
    if (after <= before) return this._leaf(node.prediction, node.samples);
    return node;
  }

  private _validationError(node: TreeNode, X_val: number[][], y_val: number[]): number {
    let err = 0;
    for (let i = 0; i < X_val.length; i++) {
      const pred = this._predictWith(node, X_val[i]);
      err += Math.pow(pred - y_val[i], 2);
    }
    return err;
  }

  private _predictWith(node: TreeNode, x: number[]): number {
    let n: TreeNode | null = node;
    while (n && !n.isLeaf) n = x[n.feature] <= n.threshold ? n.left : n.right;
    return n ? n.prediction : 0;
  }

  private _leafError(prediction: number, y: number[]): number {
    return y.reduce((s, v) => s + Math.pow(v - prediction, 2), 0);
  }

  private _accumulateImportance(node: TreeNode | null, importance: number[]): void {
    if (!node || node.isLeaf) return;
    importance[node.feature] = (importance[node.feature] ?? 0) + node.samples;
    this._accumulateImportance(node.left, importance);
    this._accumulateImportance(node.right, importance);
  }

  private _maxFeature(node: TreeNode | null): number {
    if (!node) return 0;
    if (node.isLeaf) return 0;
    return Math.max(node.feature, this._maxFeature(node.left), this._maxFeature(node.right));
  }

  private _treeDepth(node: TreeNode | null): number {
    if (!node) return 0;
    if (node.isLeaf) return 1;
    return 1 + Math.max(this._treeDepth(node.left), this._treeDepth(node.right));
  }

  private _countSplits(node: TreeNode | null): number {
    if (!node || node.isLeaf) return 0;
    return 1 + this._countSplits(node.left) + this._countSplits(node.right);
  }

  private _rootImpurity(y: number[], criterion: SplitCriterion): number {
    return criterion === 'entropy' ? this.entropy(y) : this.gini(y);
  }

  private _isPure(y: number[]): boolean {
    if (y.length === 0) return true;
    const first = y[0];
    return y.every(v => v === first);
  }

  private _mode(y: number[]): number {
    if (y.length === 0) return 0;
    const counts = new Map<number, number>();
    for (const v of y) counts.set(v, (counts.get(v) ?? 0) + 1);
    let best = y[0];
    let bestCount = 0;
    for (const [k, c] of counts) if (c > bestCount) { best = k; bestCount = c; }
    return best;
  }

  private _mean(v: number[]): number { return v.length === 0 ? 0 : v.reduce((s, x) => s + x, 0) / v.length; }

  private _bootstrap(X: number[][], y: number[]): { Xs: number[][]; ys: number[] } {
    const n = X.length;
    const Xs: number[][] = [];
    const ys: number[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      Xs.push(X[idx]);
      ys.push(y[idx]);
    }
    return { Xs, ys };
  }
}
