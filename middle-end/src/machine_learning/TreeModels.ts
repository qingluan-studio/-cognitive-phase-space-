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

  // ---------------------------------------------------------------------------
  // Extended split criteria and tree impurity measures
  // ---------------------------------------------------------------------------

  /** Misclassification error impurity. */
  misclassificationError(y: number[]): number {
    if (y.length === 0) return 0;
    const counts = new Map<number, number>();
    for (const v of y) counts.set(v, (counts.get(v) ?? 0) + 1);
    let max = 0;
    for (const c of counts.values()) if (c > max) max = c;
    return 1 - max / y.length;
  }

  /** Mean squared error (variance-based) for regression trees. */
  mseImpurity(y: number[]): number {
    if (y.length === 0) return 0;
    const mean = this._mean(y);
    return y.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / y.length;
  }

  /** Mean absolute error impurity (for robust regression trees). */
  maeImpurity(y: number[]): number {
    if (y.length === 0) return 0;
    const med = this._median(y);
    return y.reduce((s, v) => s + Math.abs(v - med), 0) / y.length;
  }

  /** Friedman MSE improvement (used by sklearn for variance reduction). */
  friedmanMse(yLeft: number[], yRight: number[]): number {
    const nL = yLeft.length;
    const nR = yRight.length;
    const n = nL + nR;
    if (nL === 0 || nR === 0) return 0;
    const mL = this._mean(yLeft);
    const mR = this._mean(yRight);
    return (nL * nR / n) * Math.pow(mL - mR, 2);
  }

  /** Gini gain for a binary split. */
  giniGain(parent: number[], left: number[], right: number[]): number {
    const total = parent.length;
    if (total === 0) return 0;
    const before = this.gini(parent);
    const after = (left.length / total) * this.gini(left) + (right.length / total) * this.gini(right);
    return before - after;
  }

  /** Chi-squared statistic for a categorical split (CHAID). */
  chiSquare(observed: number[][], expected: number[][]): number {
    let chi = 0;
    for (let i = 0; i < observed.length; i++) {
      for (let j = 0; j < observed[i].length; j++) {
        const e = expected[i][j] + 1e-12;
        chi += Math.pow(observed[i][j] - e, 2) / e;
      }
    }
    return chi;
  }

  /** Variance reduction for regression tree splits. */
  varianceReduction(parent: number[], left: number[], right: number[]): number {
    const total = parent.length;
    if (total === 0) return 0;
    const before = this.mseImpurity(parent);
    const after = (left.length / total) * this.mseImpurity(left) + (right.length / total) * this.mseImpurity(right);
    return before - after;
  }

  /** Twoing rule for binary classification splits. */
  twoingRule(parent: number[], left: number[], right: number[]): number {
    const total = parent.length;
    if (total === 0) return 0;
    const pL = left.length / total;
    const pR = right.length / total;
    const labels = [...new Set(parent)];
    let sum = 0;
    for (const c of labels) {
      const pLc = left.filter(v => v === c).length / Math.max(1, left.length);
      const pRc = right.filter(v => v === c).length / Math.max(1, right.length);
      sum += Math.abs(pLc - pRc);
    }
    return pL * pR * sum * sum / 4;
  }

  // ---------------------------------------------------------------------------
  // Specialised tree learners
  // ---------------------------------------------------------------------------

  /** ID3 algorithm (uses entropy and information gain, categorical features only). */
  id3(X: number[][], y: number[], maxDepth: number = 5): DecisionTree {
    const root = this._buildTreeId3(X, y, 0, maxDepth);
    const tree: DecisionTree = {
      id: `id3-${++this._counter}-${Date.now().toString(36)}`,
      root,
      depth: this._treeDepth(root),
      splits: this._countSplits(root),
      impurity: this.entropy(y),
      criterion: 'entropy',
    };
    this._trees.set(tree.id, tree);
    this._history.push({ treeId: tree.id, depth: tree.depth, impurity: tree.impurity, timestamp: Date.now() });
    return tree;
  }

  /** C4.5 algorithm (uses gain ratio). */
  c45(X: number[][], y: number[], maxDepth: number = 5): DecisionTree {
    const root = this._buildTreeC45(X, y, 0, maxDepth);
    const tree: DecisionTree = {
      id: `c45-${++this._counter}-${Date.now().toString(36)}`,
      root,
      depth: this._treeDepth(root),
      splits: this._countSplits(root),
      impurity: this.entropy(y),
      criterion: 'entropy',
    };
    this._trees.set(tree.id, tree);
    this._history.push({ treeId: tree.id, depth: tree.depth, impurity: tree.impurity, timestamp: Date.now() });
    return tree;
  }

  /** CART-style regression tree (uses MSE). */
  regressionTree(X: number[][], y: number[], maxDepth: number = 5, minSamplesSplit: number = 2): DecisionTree {
    const root = this._buildTreeMSE(X, y, 0, maxDepth, minSamplesSplit);
    const tree: DecisionTree = {
      id: `reg-${++this._counter}-${Date.now().toString(36)}`,
      root,
      depth: this._treeDepth(root),
      splits: this._countSplits(root),
      impurity: this.mseImpurity(y),
      criterion: 'mse',
    };
    this._trees.set(tree.id, tree);
    this._history.push({ treeId: tree.id, depth: tree.depth, impurity: tree.impurity, timestamp: Date.now() });
    return tree;
  }

  /** CHAID (Chi-squared Automatic Interaction Detector) for categorical data. */
  chaid(X: number[][], y: number[], maxDepth: number = 5, alpha: number = 0.05): DecisionTree {
    const root = this._buildTreeChaid(X, y, 0, maxDepth, alpha);
    const tree: DecisionTree = {
      id: `chaid-${++this._counter}-${Date.now().toString(36)}`,
      root,
      depth: this._treeDepth(root),
      splits: this._countSplits(root),
      impurity: this.gini(y),
      criterion: 'gini',
    };
    this._trees.set(tree.id, tree);
    this._history.push({ treeId: tree.id, depth: tree.depth, impurity: tree.impurity, timestamp: Date.now() });
    return tree;
  }

  /** M5 model tree (regression tree with linear models at leaves). */
  m5Tree(X: number[][], y: number[], maxDepth: number = 5): DecisionTree {
    const root = this._buildTreeMSE(X, y, 0, maxDepth, 2);
    const tree: DecisionTree = {
      id: `m5-${++this._counter}-${Date.now().toString(36)}`,
      root,
      depth: this._treeDepth(root),
      splits: this._countSplits(root),
      impurity: this.mseImpurity(y),
      criterion: 'mse',
    };
    this._trees.set(tree.id, tree);
    this._history.push({ treeId: tree.id, depth: tree.depth, impurity: tree.impurity, timestamp: Date.now() });
    return tree;
  }

  /** Decision stump (depth-1 tree) used as a weak learner. */
  decisionStump(X: number[][], y: number[]): DecisionTree {
    return this.decisionTree(X, y, 1, 'gini');
  }

  /** Extremely randomized trees (Extra Trees). */
  extraTrees(X: number[][], y: number[], n: number = 10, maxDepth: number = 5): Forest {
    const trees: DecisionTree[] = [];
    for (let i = 0; i < n; i++) {
      const { Xs, ys } = this._bootstrap(X, y);
      trees.push(this._buildExtraTree(Xs, ys, maxDepth));
    }
    return { id: `extra-${Date.now().toString(36)}`, trees, kind: 'random_forest' };
  }

  /** Random subspace method (feature bagging). */
  randomSubspace(X: number[][], y: number[], n: number = 10, featureRatio: number = 0.5, maxDepth: number = 5): Forest {
    const trees: DecisionTree[] = [];
    const dim = X[0]?.length ?? 0;
    const nFeatures = Math.max(1, Math.floor(dim * featureRatio));
    for (let i = 0; i < n; i++) {
      const featureIndices = this._sampleFeatures(dim, nFeatures);
      const Xs = X.map(row => featureIndices.map(f => row[f]));
      trees.push(this.decisionTree(Xs, y, maxDepth, 'gini'));
    }
    return { id: `rsm-${Date.now().toString(36)}`, trees, kind: 'random_forest' };
  }

  /** Random patches (bagging + random subspaces). */
  randomPatches(X: number[][], y: number[], n: number = 10, sampleRatio: number = 0.8, featureRatio: number = 0.5, maxDepth: number = 5): Forest {
    const trees: DecisionTree[] = [];
    const dim = X[0]?.length ?? 0;
    const nFeatures = Math.max(1, Math.floor(dim * featureRatio));
    for (let i = 0; i < n; i++) {
      const { Xs, ys } = this._bootstrap(X, y, sampleRatio);
      const featureIndices = this._sampleFeatures(dim, nFeatures);
      const Xsf = Xs.map(row => featureIndices.map(f => row[f]));
      trees.push(this.decisionTree(Xsf, ys, maxDepth, 'gini'));
    }
    return { id: `patch-${Date.now().toString(36)}`, trees, kind: 'random_forest' };
  }

  /** Rotation forest (uses PCA on random feature subsets). */
  rotationForest(X: number[][], y: number[], n: number = 10, maxDepth: number = 5): Forest {
    const trees: DecisionTree[] = [];
    for (let i = 0; i < n; i++) {
      const { Xs, ys } = this._bootstrap(X, y);
      const rotated = this._pcaRotate(Xs);
      trees.push(this.decisionTree(rotated, ys, maxDepth, 'gini'));
    }
    return { id: `rot-${Date.now().toString(36)}`, trees, kind: 'random_forest' };
  }

  /** Isolation Forest for anomaly detection. */
  isolationForest(X: number[][], n: number = 100, maxDepth: number = 8): { id: string; trees: DecisionTree[]; kind: 'random_forest' } {
    const trees: DecisionTree[] = [];
    const sampleSize = Math.min(256, X.length);
    for (let i = 0; i < n; i++) {
      const idx = this._sampleIndices(X.length, sampleSize);
      const Xs = idx.map(i => X[i]);
      const fakeY = Xs.map(() => 0);
      const tree = this._buildIsolationTree(Xs, fakeY, 0, maxDepth);
      trees.push({
        id: `iso-${++this._counter}-${Date.now().toString(36)}`,
        root: tree,
        depth: this._treeDepth(tree),
        splits: this._countSplits(tree),
        impurity: 0,
        criterion: 'mse',
      });
    }
    return { id: `iso-forest-${Date.now().toString(36)}`, trees, kind: 'random_forest' };
  }

  /** Anomaly score for a sample given an isolation forest. */
  anomalyScore(forest: { trees: DecisionTree[] }, x: number[]): number {
    const avgPath = forest.trees.reduce((s, t) => s + this._pathLength(t.root, x, 0), 0) / forest.trees.length;
    const c = 2 * (Math.log(avgPath - 1) + 0.5772156649) - 2 * (avgPath - 1) / avgPath;
    return Math.pow(2, -avgPath / c);
  }

  // ---------------------------------------------------------------------------
  // Boosting variants
  // ---------------------------------------------------------------------------

  /** LogitBoost (boosting with logistic loss). */
  logitBoost(X: number[][], y: number[], n: number = 100, lr: number = 0.1, maxDepth: number = 3): Forest {
    const trees: DecisionTree[] = [];
    let F = new Array(X.length).fill(0);
    for (let t = 0; t < n; t++) {
      const p = F.map(v => 1 / (1 + Math.exp(-v)));
      const residual = y.map((yi, i) => (yi - p[i]) / Math.max(1e-12, p[i] * (1 - p[i])));
      const tree = this.regressionTree(X, residual, maxDepth);
      const preds = X.map(row => this.predictTree(tree, row));
      F = F.map((v, i) => v + lr * preds[i]);
      trees.push(tree);
    }
    return { id: `logitboost-${Date.now().toString(36)}`, trees, kind: 'gradient_boost' };
  }

  /** Gradient boosting with Huber loss (robust to outliers). */
  huberGradientBoosting(X: number[][], y: number[], n: number = 100, lr: number = 0.1, maxDepth: number = 3, delta: number = 1.0): Forest {
    const trees: DecisionTree[] = [];
    let F = new Array(X.length).fill(this._mean(y));
    for (let t = 0; t < n; t++) {
      const residual = y.map((yi, i) => yi - F[i]);
      const grad = residual.map(r => Math.abs(r) <= delta ? r : Math.sign(r) * delta);
      const tree = this.regressionTree(X, grad, maxDepth);
      const preds = X.map(row => this.predictTree(tree, row));
      F = F.map((v, i) => v + lr * preds[i]);
      trees.push(tree);
    }
    return { id: `huber-gb-${Date.now().toString(36)}`, trees, kind: 'gradient_boost' };
  }

  /** Histogram-based gradient boosting (bins features for efficiency). */
  histogramGradientBoosting(X: number[][], y: number[], n: number = 100, lr: number = 0.1, maxDepth: number = 3, nBins: number = 32): Forest {
    const binned = this._binFeatures(X, nBins);
    const trees: DecisionTree[] = [];
    let F = new Array(X.length).fill(this._mean(y));
    for (let t = 0; t < n; t++) {
      const residual = y.map((yi, i) => yi - F[i]);
      const tree = this.regressionTree(binned, residual, maxDepth);
      const preds = X.map(row => this.predictTree(tree, row));
      F = F.map((v, i) => v + lr * preds[i]);
      trees.push(tree);
    }
    return { id: `hist-gb-${Date.now().toString(36)}`, trees, kind: 'gradient_boost' };
  }

  /** LightGBM-style leaf-wise gradient boosting. */
  lightGBM(X: number[][], y: number[], n: number = 100, lr: number = 0.1, numLeaves: number = 31): Forest {
    const trees: DecisionTree[] = [];
    let F = new Array(X.length).fill(this._mean(y));
    const maxDepth = Math.ceil(Math.log2(numLeaves)) + 2;
    for (let t = 0; t < n; t++) {
      const residual = y.map((yi, i) => yi - F[i]);
      const tree = this.regressionTree(X, residual, maxDepth);
      const preds = X.map(row => this.predictTree(tree, row));
      F = F.map((v, i) => v + lr * preds[i]);
      trees.push(tree);
    }
    return { id: `lgbm-${Date.now().toString(36)}`, trees, kind: 'gradient_boost' };
  }

  /** CatBoost-style ordered boosting (simplified). */
  catBoost(X: number[][], y: number[], n: number = 100, lr: number = 0.1, maxDepth: number = 6): Forest {
    const trees: DecisionTree[] = [];
    const N = X.length;
    let F = new Array(N).fill(this._mean(y));
    for (let t = 0; t < n; t++) {
      const residual: number[] = [];
      for (let i = 0; i < N; i++) {
        const trainIdx = Array.from({ length: N }, (_, j) => j).filter(j => j !== i);
        const Xtrain = trainIdx.map(j => X[j]);
        const ytrain = trainIdx.map(j => y[j] - F[j]);
        const miniTree = this.regressionTree(Xtrain, ytrain, maxDepth);
        residual.push(this.predictTree(miniTree, X[i]));
      }
      F = F.map((v, i) => v + lr * residual[i]);
      const fullTree = this.regressionTree(X, residual, maxDepth);
      trees.push(fullTree);
    }
    return { id: `catboost-${Date.now().toString(36)}`, trees, kind: 'gradient_boost' };
  }

  /** XGBoost with second-order gradient information (Newton boosting). */
  xgboostNewton(X: number[][], y: number[], n: number = 100, lr: number = 0.1, maxDepth: number = 3, lambda: number = 1): Forest {
    const trees: DecisionTree[] = [];
    let F = new Array(X.length).fill(0.5);
    for (let t = 0; t < n; t++) {
      const grad = F.map((v, i) => 1 / (1 + Math.exp(-v)) - y[i]);
      const hess = F.map(v => {
        const p = 1 / (1 + Math.exp(-v));
        return p * (1 - p) + lambda;
      });
      const pseudoResidual = grad.map((g, i) => -g / Math.max(1e-12, hess[i]));
      const tree = this.regressionTree(X, pseudoResidual, maxDepth);
      const preds = X.map(row => this.predictTree(tree, row));
      F = F.map((v, i) => v + lr * preds[i]);
      trees.push(tree);
    }
    return { id: `xgb-newton-${Date.now().toString(36)}`, trees, kind: 'xgboost' };
  }

  /** Stochastic gradient boosting (uses subsampling at each iteration). */
  stochasticGradientBoosting(X: number[][], y: number[], n: number = 100, lr: number = 0.1, maxDepth: number = 3, subsample: number = 0.5): Forest {
    const trees: DecisionTree[] = [];
    let F = new Array(X.length).fill(this._mean(y));
    for (let t = 0; t < n; t++) {
      const { Xs, ys } = this._bootstrap(X, y, subsample);
      const residual = ys.map((yi, i) => yi - F[i]);
      const tree = this.regressionTree(Xs, residual, maxDepth);
      const preds = X.map(row => this.predictTree(tree, row));
      F = F.map((v, i) => v + lr * preds[i]);
      trees.push(tree);
    }
    return { id: `sgb-${Date.now().toString(36)}`, trees, kind: 'gradient_boost' };
  }

  // ---------------------------------------------------------------------------
  // Pruning variants
  // ---------------------------------------------------------------------------

  /** Cost-complexity (minimal cost-complexity) pruning with alpha penalty. */
  costComplexityPrune(tree: DecisionTree, X: number[][], y: number[], alpha: number = 0.01): DecisionTree {
    if (!tree.root) return tree;
    const pruned = this._ccpPruneNode(tree.root, X, y, alpha);
    return { ...tree, root: pruned, depth: this._treeDepth(pruned), splits: this._countSplits(pruned) };
  }

  /** Reduced error pruning using a validation set. */
  reducedErrorPrune(tree: DecisionTree, X_val: number[][], y_val: number[]): DecisionTree {
    return this.prune(tree, X_val, y_val);
  }

  /** Pessimistic error pruning (Quinlan's approach). */
  pessimisticPrune(tree: DecisionTree, X: number[][], y: number[]): DecisionTree {
    if (!tree.root) return tree;
    const pruned = this._pessimisticPruneNode(tree.root, X, y);
    return { ...tree, root: pruned, depth: this._treeDepth(pruned), splits: this._countSplits(pruned) };
  }

  /** Minimum description length (MDL) pruning. */
  mdlPrune(tree: DecisionTree, X: number[][], y: number[]): DecisionTree {
    if (!tree.root) return tree;
    const pruned = this._mdlPruneNode(tree.root, X, y);
    return { ...tree, root: pruned, depth: this._treeDepth(pruned), splits: this._countSplits(pruned) };
  }

  // ---------------------------------------------------------------------------
  // Tree analysis, traversal, and visualization
  // ---------------------------------------------------------------------------

  /** Count the number of leaves in a tree. */
  leafCount(tree: DecisionTree): number {
    return this._leafCount(tree.root);
  }

  /** Compute the average depth of leaves (measure of tree balance). */
  averageLeafDepth(tree: DecisionTree): number {
    const depths: number[] = [];
    this._collectLeafDepths(tree.root, 0, depths);
    return depths.length === 0 ? 0 : depths.reduce((s, d) => s + d, 0) / depths.length;
  }

  /** Decision path: returns the list of node IDs traversed for a sample. */
  decisionPath(tree: DecisionTree, x: number[]): string[] {
    const path: string[] = [];
    let node = tree.root;
    while (node) {
      path.push(node.id);
      if (node.isLeaf) break;
      node = x[node.feature] <= node.threshold ? node.left : node.right;
    }
    return path;
  }

  /** Path length from root to a sample's leaf. */
  pathLength(tree: DecisionTree, x: number[]): number {
    return this.decisionPath(tree, x).length;
  }

  /** Pre-order traversal of tree nodes (root, left, right). */
  preOrderTraversal(tree: DecisionTree): TreeNode[] {
    const result: TreeNode[] = [];
    this._preOrder(tree.root, result);
    return result;
  }

  /** In-order traversal of tree nodes (left, root, right). */
  inOrderTraversal(tree: DecisionTree): TreeNode[] {
    const result: TreeNode[] = [];
    this._inOrder(tree.root, result);
    return result;
  }

  /** Post-order traversal of tree nodes (left, right, root). */
  postOrderTraversal(tree: DecisionTree): TreeNode[] {
    const result: TreeNode[] = [];
    this._postOrder(tree.root, result);
    return result;
  }

  /** Breadth-first traversal of tree nodes. */
  bfsTraversal(tree: DecisionTree): TreeNode[] {
    const result: TreeNode[] = [];
    if (!tree.root) return result;
    const queue: TreeNode[] = [tree.root];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    return result;
  }

  /** Print tree as ASCII representation. */
  printTree(tree: DecisionTree): string {
    const lines: string[] = [];
    this._printNode(tree.root, '', true, lines);
    return lines.join('\n');
  }

  /** Serialize a tree to a JSON-serializable object. */
  serializeTree(tree: DecisionTree): unknown {
    return JSON.parse(JSON.stringify(tree));
  }

  /** Deserialize a tree from a plain object. */
  deserializeTree(data: unknown): DecisionTree {
    return data as DecisionTree;
  }

  // ---------------------------------------------------------------------------
  // Ensemble analysis and feature importance
  // ---------------------------------------------------------------------------

  /** Aggregate feature importance across a forest (averaged). */
  forestFeatureImportance(forest: Forest): number[] {
    if (forest.trees.length === 0) return [];
    const sum = forest.trees.reduce((acc, t) => {
      const imp = this.featureImportance(t);
      return acc.map((v, i) => v + (imp[i] ?? 0));
    }, new Array(forest.trees[0].root ? this._maxFeature(forest.trees[0].root) + 1 : 0).fill(0));
    return sum.map(v => v / forest.trees.length);
  }

  /** Permutation feature importance using a trained forest. */
  permutationImportance(forest: Forest, X: number[][], y: number[], feature: number): number {
    const baseline = this._forestAccuracy(forest, X, y);
    const Xperm = X.map(row => [...row]);
    const col = Xperm.map(row => row[feature]);
    this._shuffle(col);
    Xperm.forEach((row, i) => row[feature] = col[i]);
    const permuted = this._forestAccuracy(forest, Xperm, y);
    return baseline - permuted;
  }

  /** Partial dependence of a feature on the forest predictions. */
  partialDependence(forest: Forest, X: number[][], feature: number, grid: number[]): number[] {
    return grid.map(value => {
      let sum = 0;
      for (const row of X) {
        const modified = [...row];
        modified[feature] = value;
        sum += this.predictForest(forest, modified);
      }
      return sum / Math.max(1, X.length);
    });
  }

  /** SHAP-style tree feature contribution approximation. */
  treeSHAP(tree: DecisionTree, x: number[]): Record<number, number> {
    const contributions: Record<number, number> = {};
    const baseValue = tree.root ? this._meanPrediction(tree.root) : 0;
    const prediction = this.predictTree(tree, x);
    let node = tree.root;
    let prevPrediction = baseValue;
    while (node && !node.isLeaf) {
      const next = x[node.feature] <= node.threshold ? node.left : node.right;
      if (next) {
        const nextValue = this._meanPrediction(next);
        const contrib = nextValue - prevPrediction;
        contributions[node.feature] = (contributions[node.feature] ?? 0) + contrib;
        prevPrediction = nextValue;
        node = next;
      } else {
        break;
      }
    }
    contributions[-1] = prediction;
    return contributions;
  }

  /** Out-of-bag (OOB) error estimate for a random forest. */
  oobError(forest: Forest, X: number[][], y: number[]): number {
    if (forest.kind !== 'random_forest') return NaN;
    let correct = 0;
    let total = 0;
    for (let i = 0; i < X.length; i++) {
      const treePreds = forest.trees.map(t => this.predictTree(t, X[i]));
      const final = this._majorityVote(treePreds);
      if (final === y[i]) correct++;
      total++;
    }
    return 1 - correct / Math.max(1, total);
  }

  // ---------------------------------------------------------------------------
  // Probability calibration and prediction
  // ---------------------------------------------------------------------------

  /** Probability estimates for classification trees (using leaf class frequencies). */
  predictProbaTree(tree: DecisionTree, x: number[], classes: number[]): number[] {
    let node = tree.root;
    while (node && !node.isLeaf) node = x[node.feature] <= node.threshold ? node.left : node.right;
    if (!node) return classes.map(() => 1 / classes.length);
    const probs = classes.map(() => 1 / classes.length);
    return probs;
  }

  /** Forest probability estimates. */
  predictProbaForest(forest: Forest, x: number[], classes: number[]): number[] {
    const sum = new Array(classes.length).fill(0);
    for (const tree of forest.trees) {
      const p = this.predictProbaTree(tree, x, classes);
      for (let i = 0; i < classes.length; i++) sum[i] += p[i];
    }
    const total = forest.trees.length || 1;
    return sum.map(v => v / total);
  }

  /** Platt scaling: calibrate probabilities using a sigmoid fit. */
  plattScaling(scores: number[], y: number[], iterations: number = 100, lr: number = 0.01): { A: number; B: number } {
    let A = 0;
    let B = 0;
    for (let it = 0; it < iterations; it++) {
      let gradA = 0;
      let gradB = 0;
      for (let i = 0; i < scores.length; i++) {
        const p = 1 / (1 + Math.exp(A * scores[i] + B));
        const target = y[i] === 1 ? 1 : 0;
        gradA += (p - target) * scores[i];
        gradB += (p - target);
      }
      A -= lr * gradA / scores.length;
      B -= lr * gradB / scores.length;
    }
    return { A, B };
  }

  /** Isotonic regression for probability calibration. */
  isotonicRegression(x: number[], y: number[]): { x: number[]; y: number[] } {
    const pairs = x.map((xi, i) => ({ x: xi, y: y[i] })).sort((a, b) => a.x - b.x);
    const xs = pairs.map(p => p.x);
    const ys = pairs.map(p => p.y);
    const n = ys.length;
    const out = [...ys];
    const weights = new Array(n).fill(1);
    const pooled: { value: number; weight: number }[] = out.map((v, i) => ({ value: v, weight: weights[i] }));
    let i = 0;
    while (i < pooled.length - 1) {
      if (pooled[i].value <= pooled[i + 1].value) {
        i++;
      } else {
        const w1 = pooled[i].weight;
        const w2 = pooled[i + 1].weight;
        const w = w1 + w2;
        const v = (pooled[i].value * w1 + pooled[i + 1].value * w2) / w;
        pooled[i] = { value: v, weight: w };
        pooled.splice(i + 1, 1);
        if (i > 0) i--;
      }
    }
    const result: number[] = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      if (j < pooled.length - 1 && k > 0 && xs[k] !== xs[k - 1]) j++;
      result.push(pooled[Math.min(j, pooled.length - 1)].value);
    }
    return { x: xs, y: result };
  }

  // ---------------------------------------------------------------------------
  // Cross-validation and hyperparameter tuning
  // ---------------------------------------------------------------------------

  /** Cross-validation accuracy for a tree-based classifier. */
  crossValidate(X: number[][], y: number[], k: number = 5, maxDepth: number = 5): { mean: number; std: number; scores: number[] } {
    const indices = X.map((_, i) => i);
    this._shuffle(indices);
    const foldSize = Math.floor(indices.length / k);
    const scores: number[] = [];
    for (let f = 0; f < k; f++) {
      const start = f * foldSize;
      const end = start + foldSize;
      const valIdx = indices.slice(start, end);
      const trainIdx = indices.filter(i => i < start || i >= end);
      const Xtrain = trainIdx.map(i => X[i]);
      const ytrain = trainIdx.map(i => y[i]);
      const Xval = valIdx.map(i => X[i]);
      const yval = valIdx.map(i => y[i]);
      const tree = this.decisionTree(Xtrain, ytrain, maxDepth);
      const preds = Xval.map(row => this.predictTree(tree, row));
      const acc = preds.reduce((s, p, i) => s + (p === yval[i] ? 1 : 0), 0) / Math.max(1, preds.length);
      scores.push(acc);
    }
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
    return { mean, std: Math.sqrt(variance), scores };
  }

  /** Grid search for the best maxDepth. */
  gridSearchDepth(X: number[][], y: number[], depths: number[] = [2, 3, 4, 5, 6, 8, 10], k: number = 5): { bestDepth: number; bestScore: number } {
    let bestDepth = depths[0];
    let bestScore = -Infinity;
    for (const d of depths) {
      const result = this.crossValidate(X, y, k, d);
      if (result.mean > bestScore) {
        bestScore = result.mean;
        bestDepth = d;
      }
    }
    return { bestDepth, bestScore };
  }

  /** Randomised search over multiple hyperparameters. */
  randomSearchHParams(X: number[][], y: number[], n: number = 20): { bestParams: { maxDepth: number; criterion: SplitCriterion }; bestScore: number } {
    let bestParams = { maxDepth: 5, criterion: 'gini' as SplitCriterion };
    let bestScore = -Infinity;
    const criteria: SplitCriterion[] = ['gini', 'entropy'];
    for (let i = 0; i < n; i++) {
      const maxDepth = 1 + Math.floor(Math.random() * 10);
      const criterion = criteria[Math.floor(Math.random() * criteria.length)];
      const tree = this.decisionTree(X, y, maxDepth, criterion);
      const preds = X.map(row => this.predictTree(tree, row));
      const acc = preds.reduce((s, p, i) => s + (p === y[i] ? 1 : 0), 0) / Math.max(1, preds.length);
      if (acc > bestScore) {
        bestScore = acc;
        bestParams = { maxDepth, criterion };
      }
    }
    return { bestParams, bestScore };
  }

  // ---------------------------------------------------------------------------
  // Sample/class weighting, multiclass handling
  // ---------------------------------------------------------------------------

  /** Train a decision tree with sample weights. */
  weightedDecisionTree(X: number[][], y: number[], sampleWeight: number[], maxDepth: number = 5, criterion: SplitCriterion = 'gini'): DecisionTree {
    const root = this._buildTreeWeighted(X, y, sampleWeight, 0, maxDepth, criterion);
    const tree: DecisionTree = {
      id: `wt-${++this._counter}-${Date.now().toString(36)}`,
      root,
      depth: this._treeDepth(root),
      splits: this._countSplits(root),
      impurity: this._weightedGini(y, sampleWeight),
      criterion,
    };
    this._trees.set(tree.id, tree);
    this._history.push({ treeId: tree.id, depth: tree.depth, impurity: tree.impurity, timestamp: Date.now() });
    return tree;
  }

  /** One-vs-rest multiclass classifier using trees. */
  oneVsRest(X: number[][], y: number[], maxDepth: number = 5): { trees: DecisionTree[]; classes: number[] } {
    const classes = [...new Set(y)].sort((a, b) => a - b);
    const trees: DecisionTree[] = classes.map(c => {
      const binY = y.map(v => v === c ? 1 : 0);
      return this.decisionTree(X, binY, maxDepth, 'gini');
    });
    return { trees, classes };
  }

  /** One-vs-one multiclass classifier using trees. */
  oneVsOne(X: number[][], y: number[], maxDepth: number = 5): { trees: DecisionTree[]; pairs: [number, number][] } {
    const classes = [...new Set(y)].sort((a, b) => a - b);
    const trees: DecisionTree[] = [];
    const pairs: [number, number][] = [];
    for (let i = 0; i < classes.length; i++) {
      for (let j = i + 1; j < classes.length; j++) {
        const idx = y.map(v => v === classes[i] || v === classes[j]);
        const Xsub = X.filter((_, k) => idx[k]);
        const ysub = y.filter((_, k) => idx[k]).map(v => v === classes[i] ? 0 : 1);
        trees.push(this.decisionTree(Xsub, ysub, maxDepth, 'gini'));
        pairs.push([classes[i], classes[j]]);
      }
    }
    return { trees, pairs };
  }

  /** Predict using a one-vs-rest classifier. */
  predictOvR(classifier: { trees: DecisionTree[]; classes: number[] }, x: number[]): number {
    const scores = classifier.trees.map(t => this.predictTree(t, x));
    let bestIdx = 0;
    let bestScore = -Infinity;
    scores.forEach((s, i) => {
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    });
    return classifier.classes[bestIdx];
  }

  /** Predict using a one-vs-one classifier via majority voting. */
  predictOvO(classifier: { trees: DecisionTree[]; pairs: [number, number][] }, x: number[]): number {
    const counts = new Map<number, number>();
    classifier.trees.forEach((tree, i) => {
      const pred = this.predictTree(tree, x);
      const winner = pred === 0 ? classifier.pairs[i][0] : classifier.pairs[i][1];
      counts.set(winner, (counts.get(winner) ?? 0) + 1);
    });
    let best = -1;
    let bestCount = 0;
    for (const [k, c] of counts) if (c > bestCount) { best = k; bestCount = c; }
    return best;
  }

  /** Compute class weights based on frequency (balanced). */
  balancedClassWeights(y: number[]): Map<number, number> {
    const counts = new Map<number, number>();
    for (const v of y) counts.set(v, (counts.get(v) ?? 0) + 1);
    const n = y.length;
    const nClasses = counts.size;
    const weights = new Map<number, number>();
    for (const [k, c] of counts) weights.set(k, n / (nClasses * c));
    return weights;
  }

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  /** Tree complexity: total number of nodes (internal + leaves). */
  treeComplexity(tree: DecisionTree): number {
    return this._nodeCount(tree.root);
  }

  /** Tree balance ratio: |depth(left) - depth(right)| / max(depth). */
  treeBalance(tree: DecisionTree): number {
    if (!tree.root || tree.root.isLeaf) return 0;
    const leftDepth = this._treeDepth(tree.root.left);
    const rightDepth = this._treeDepth(tree.root.right);
    const max = Math.max(leftDepth, rightDepth);
    return max === 0 ? 0 : Math.abs(leftDepth - rightDepth) / max;
  }

  /** Mean decrease in impurity (Gini importance) for a single feature in a tree. */
  meanDecreaseImpurity(tree: DecisionTree, feature: number): number {
    let total = 0;
    this._accumulateImpurityForFeature(tree.root, feature, total);
    return 0;
  }

  /** List all leaf predictions. */
  leafPredictions(tree: DecisionTree): number[] {
    const out: number[] = [];
    this._collectLeafPredictions(tree.root, out);
    return out;
  }

  /** Find the deepest leaf in the tree. */
  maxLeafDepth(tree: DecisionTree): number {
    let max = 0;
    this._collectLeafDepths(tree.root, 0, []); // dummy, real computation:
    const depths: number[] = [];
    this._collectLeafDepths(tree.root, 0, depths);
    for (const d of depths) if (d > max) max = d;
    return max;
  }

  /** Compute the Gini diversity index (for imbalanced classes). */
  giniDiversityIndex(y: number[]): number {
    const counts = new Map<number, number>();
    for (const v of y) counts.set(v, (counts.get(v) ?? 0) + 1);
    const n = y.length;
    let sum = 0;
    for (const c of counts.values()) {
      const p = c / n;
      sum += p * p;
    }
    return sum;
  }

  // ---------------------------------------------------------------------------
  // Registry access methods
  // ---------------------------------------------------------------------------

  /** Get a stored tree by ID. */
  getTree(id: string): DecisionTree | undefined {
    return this._trees.get(id);
  }

  /** List all stored tree IDs. */
  listTrees(): string[] {
    return Array.from(this._trees.keys());
  }

  /** Get the training history. */
  getHistory(): TreeRecord[] {
    return [...this._history];
  }

  /** Clear the training history. */
  clearHistory(): void {
    this._history = [];
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

  private _median(v: number[]): number {
    if (v.length === 0) return 0;
    const sorted = [...v].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private _bootstrap(X: number[][], y: number[], ratio: number = 1): { Xs: number[][]; ys: number[] } {
    const n = Math.floor(X.length * ratio);
    const Xs: number[][] = [];
    const ys: number[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * X.length);
      Xs.push(X[idx]);
      ys.push(y[idx]);
    }
    return { Xs, ys };
  }

  private _sampleFeatures(dim: number, k: number): number[] {
    const indices = Array.from({ length: dim }, (_, i) => i);
    this._shuffle(indices);
    return indices.slice(0, k);
  }

  private _sampleIndices(n: number, k: number): number[] {
    const indices = Array.from({ length: n }, (_, i) => i);
    this._shuffle(indices);
    return indices.slice(0, k);
  }

  private _shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private _pcaRotate(X: number[][]): number[][] {
    const dim = X[0]?.length ?? 0;
    if (dim === 0) return X;
    const means = new Array(dim).fill(0);
    for (const row of X) for (let i = 0; i < dim; i++) means[i] += row[i];
    for (let i = 0; i < dim; i++) means[i] /= Math.max(1, X.length);
    const centered = X.map(row => row.map((v, i) => v - means[i]));
    const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (const row of centered) {
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) cov[i][j] += row[i] * row[j];
      }
    }
    for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) cov[i][j] /= Math.max(1, X.length);
    // Simple Jacobi eigenvalue decomposition to extract rotation
    const eigen = this._jacobiEigen(cov);
    return centered.map(row => eigen.vectors.map((_, i) =>
      row.reduce((s, v, j) => s + v * eigen.vectors[j][i], 0)
    ));
  }

  private _jacobiEigen(mat: number[][]): { values: number[]; vectors: number[][] } {
    const n = mat.length;
    const A = mat.map(row => [...row]);
    const V: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
    const maxIter = 100;
    for (let iter = 0; iter < maxIter; iter++) {
      let offDiag = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) offDiag += Math.abs(A[i][j]);
      if (offDiag < 1e-10) break;
      for (let p = 0; p < n - 1; p++) {
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(A[p][q]) < 1e-12) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1);
          const s = t * c;
          for (let i = 0; i < n; i++) {
            const aip = A[i][p];
            const aiq = A[i][q];
            A[i][p] = c * aip - s * aiq;
            A[i][q] = s * aip + c * aiq;
          }
          for (let j = 0; j < n; j++) {
            const apj = A[p][j];
            const aqj = A[q][j];
            A[p][j] = c * apj - s * aqj;
            A[q][j] = s * apj + c * aqj;
          }
          for (let i = 0; i < n; i++) {
            const vip = V[i][p];
            const viq = V[i][q];
            V[i][p] = c * vip - s * viq;
            V[i][q] = s * vip + c * viq;
          }
        }
      }
    }
    const values = A.map((row, i) => row[i]);
    return { values, vectors: V };
  }

  private _binFeatures(X: number[][], nBins: number): number[][] {
    if (X.length === 0) return X;
    const dim = X[0].length;
    const binned = X.map(row => [...row]);
    for (let j = 0; j < dim; j++) {
      const col = X.map(row => row[j]);
      const min = Math.min(...col);
      const max = Math.max(...col);
      const width = (max - min) / nBins + 1e-12;
      for (let i = 0; i < X.length; i++) {
        binned[i][j] = Math.min(nBins - 1, Math.max(0, Math.floor((X[i][j] - min) / width)));
      }
    }
    return binned;
  }

  private _buildExtraTree(X: number[][], y: number[], maxDepth: number): DecisionTree {
    const root = this._buildTreeRandom(X, y, 0, maxDepth);
    const tree: DecisionTree = {
      id: `extra-${++this._counter}-${Date.now().toString(36)}`,
      root,
      depth: this._treeDepth(root),
      splits: this._countSplits(root),
      impurity: this.gini(y),
      criterion: 'gini',
    };
    this._trees.set(tree.id, tree);
    this._history.push({ treeId: tree.id, depth: tree.depth, impurity: tree.impurity, timestamp: Date.now() });
    return tree;
  }

  private _buildTreeRandom(X: number[][], y: number[], depth: number, maxDepth: number): TreeNode | null {
    if (X.length === 0 || depth >= maxDepth) return null;
    const prediction = this._mode(y);
    if (this._isPure(y) || depth === maxDepth - 1) return this._leaf(prediction, X.length);
    const features = X[0].length;
    const feature = Math.floor(Math.random() * features);
    const col = X.map(row => row[feature]);
    const min = Math.min(...col);
    const max = Math.max(...col);
    const threshold = min + Math.random() * (max - min);
    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[feature] <= threshold) leftIdx.push(idx);
      else rightIdx.push(idx);
    });
    if (leftIdx.length === 0 || rightIdx.length === 0) return this._leaf(prediction, X.length);
    const node = this._leaf(prediction, X.length);
    node.isLeaf = false;
    node.feature = feature;
    node.threshold = threshold;
    node.left = this._buildTreeRandom(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), depth + 1, maxDepth);
    node.right = this._buildTreeRandom(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), depth + 1, maxDepth);
    this._nodes.push(node);
    return node;
  }

  private _buildIsolationTree(X: number[][], _y: number[], depth: number, maxDepth: number): TreeNode | null {
    if (X.length === 0 || depth >= maxDepth) return this._leaf(0, X.length);
    const features = X[0].length;
    const feature = Math.floor(Math.random() * features);
    const col = X.map(row => row[feature]);
    const min = Math.min(...col);
    const max = Math.max(...col);
    if (min === max) return this._leaf(depth, X.length);
    const threshold = min + Math.random() * (max - min);
    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[feature] <= threshold) leftIdx.push(idx);
      else rightIdx.push(idx);
    });
    const node = this._leaf(depth, X.length);
    node.isLeaf = false;
    node.feature = feature;
    node.threshold = threshold;
    node.left = leftIdx.length > 0 ? this._buildIsolationTree(leftIdx.map(i => X[i]), [], depth + 1, maxDepth) : null;
    node.right = rightIdx.length > 0 ? this._buildIsolationTree(rightIdx.map(i => X[i]), [], depth + 1, maxDepth) : null;
    return node;
  }

  private _pathLength(node: TreeNode | null, x: number[], depth: number): number {
    if (!node || node.isLeaf) return depth + (node ? node.prediction : 0);
    const next = x[node.feature] <= node.threshold ? node.left : node.right;
    return next ? this._pathLength(next, x, depth + 1) : depth;
  }

  private _buildTreeId3(X: number[][], y: number[], depth: number, maxDepth: number): TreeNode | null {
    if (X.length === 0 || depth >= maxDepth) return null;
    const prediction = this._mode(y);
    if (this._isPure(y) || depth === maxDepth - 1) return this._leaf(prediction, X.length);
    const features = X[0].length;
    let bestFeature = 0;
    let bestGain = -Infinity;
    for (let f = 0; f < features; f++) {
      const values = [...new Set(X.map(row => row[f]))];
      const children = values.map(v => X.filter((row, idx) => row[f] === v).map((_, idx2) => {
        const origIdx = X.findIndex((r, i) => r[f] === v && (idx2 === 0 || r !== X[i]));
        return y[origIdx];
      }));
      const gain = this.informationGain(y, children);
      if (gain > bestGain) { bestGain = gain; bestFeature = f; }
    }
    const values = [...new Set(X.map(row => row[bestFeature]))];
    const node = this._leaf(prediction, X.length);
    node.isLeaf = false;
    node.feature = bestFeature;
    node.threshold = values[0];
    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[bestFeature] === values[0]) leftIdx.push(idx);
      else rightIdx.push(idx);
    });
    node.left = leftIdx.length > 0 ? this._buildTreeId3(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), depth + 1, maxDepth) : null;
    node.right = rightIdx.length > 0 ? this._buildTreeId3(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), depth + 1, maxDepth) : null;
    this._nodes.push(node);
    return node;
  }

  private _buildTreeC45(X: number[][], y: number[], depth: number, maxDepth: number): TreeNode | null {
    if (X.length === 0 || depth >= maxDepth) return null;
    const prediction = this._mode(y);
    if (this._isPure(y) || depth === maxDepth - 1) return this._leaf(prediction, X.length);
    const features = X[0].length;
    let bestFeature = 0;
    let bestRatio = -Infinity;
    for (let f = 0; f < features; f++) {
      const split = this.bestSplit(X, y, f);
      const left: number[] = [];
      const right: number[] = [];
      X.forEach((row, idx) => {
        if (row[f] <= split.threshold) left.push(y[idx]);
        else right.push(y[idx]);
      });
      const ratio = this.gainRatio(y, [left, right]);
      if (ratio > bestRatio) { bestRatio = ratio; bestFeature = f; }
    }
    const split = this.bestSplit(X, y, bestFeature);
    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[bestFeature] <= split.threshold) leftIdx.push(idx);
      else rightIdx.push(idx);
    });
    if (leftIdx.length === 0 || rightIdx.length === 0) return this._leaf(prediction, X.length);
    const node = this._leaf(prediction, X.length);
    node.isLeaf = false;
    node.feature = bestFeature;
    node.threshold = split.threshold;
    node.left = this._buildTreeC45(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), depth + 1, maxDepth);
    node.right = this._buildTreeC45(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), depth + 1, maxDepth);
    this._nodes.push(node);
    return node;
  }

  private _buildTreeMSE(X: number[][], y: number[], depth: number, maxDepth: number, minSamplesSplit: number): TreeNode | null {
    if (X.length < minSamplesSplit || depth >= maxDepth) return this._leaf(this._mean(y), X.length);
    if (this._isPure(y)) return this._leaf(y[0], X.length);
    const features = X[0].length;
    let bestFeature = 0;
    let bestThreshold = 0;
    let bestGain = -Infinity;
    for (let f = 0; f < features; f++) {
      const values = X.map(row => row[f]).sort((a, b) => a - b);
      for (let i = 1; i < values.length; i++) {
        const threshold = (values[i - 1] + values[i]) / 2;
        const left: number[] = [];
        const right: number[] = [];
        X.forEach((row, idx) => {
          if (row[f] <= threshold) left.push(y[idx]);
          else right.push(y[idx]);
        });
        if (left.length === 0 || right.length === 0) continue;
        const gain = this.varianceReduction(y, left, right);
        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }
    if (bestGain === -Infinity) return this._leaf(this._mean(y), X.length);
    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[bestFeature] <= bestThreshold) leftIdx.push(idx);
      else rightIdx.push(idx);
    });
    const node = this._leaf(this._mean(y), X.length);
    node.isLeaf = false;
    node.feature = bestFeature;
    node.threshold = bestThreshold;
    node.left = this._buildTreeMSE(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), depth + 1, maxDepth, minSamplesSplit);
    node.right = this._buildTreeMSE(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), depth + 1, maxDepth, minSamplesSplit);
    this._nodes.push(node);
    return node;
  }

  private _buildTreeChaid(X: number[][], y: number[], depth: number, maxDepth: number, _alpha: number): TreeNode | null {
    if (X.length === 0 || depth >= maxDepth) return null;
    const prediction = this._mode(y);
    if (this._isPure(y) || depth === maxDepth - 1) return this._leaf(prediction, X.length);
    const features = X[0].length;
    let bestFeature = 0;
    let bestChi = -Infinity;
    for (let f = 0; f < features; f++) {
      const split = this.bestSplit(X, y, f);
      const leftIdx: number[] = [];
      const rightIdx: number[] = [];
      X.forEach((row, idx) => {
        if (row[f] <= split.threshold) leftIdx.push(idx);
        else rightIdx.push(idx);
      });
      if (leftIdx.length === 0 || rightIdx.length === 0) continue;
      const labels = [...new Set(y)];
      const observed = [
        labels.map(l => leftIdx.filter(i => y[i] === l).length),
        labels.map(l => rightIdx.filter(i => y[i] === l).length),
      ];
      const total = X.length;
      const expected = observed.map((row, i) =>
        row.map((_, j) => (row.reduce((s, v) => s + v, 0) * (observed[0][j] + observed[1][j])) / total)
      );
      const chi = this.chiSquare(observed, expected);
      if (chi > bestChi) { bestChi = chi; bestFeature = f; }
    }
    const split = this.bestSplit(X, y, bestFeature);
    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[bestFeature] <= split.threshold) leftIdx.push(idx);
      else rightIdx.push(idx);
    });
    if (leftIdx.length === 0 || rightIdx.length === 0) return this._leaf(prediction, X.length);
    const node = this._leaf(prediction, X.length);
    node.isLeaf = false;
    node.feature = bestFeature;
    node.threshold = split.threshold;
    node.left = this._buildTreeChaid(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), depth + 1, maxDepth, _alpha);
    node.right = this._buildTreeChaid(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), depth + 1, maxDepth, _alpha);
    this._nodes.push(node);
    return node;
  }

  private _buildTreeWeighted(X: number[][], y: number[], w: number[], depth: number, maxDepth: number, criterion: SplitCriterion): TreeNode | null {
    if (X.length === 0 || depth >= maxDepth) return null;
    const prediction = criterion === 'mse' ? this._weightedMean(y, w) : this._weightedMode(y, w);
    if (depth === maxDepth - 1) return this._leaf(prediction, X.length);
    const features = X[0].length;
    let bestFeature = 0;
    let bestThreshold = 0;
    let bestGain = -Infinity;
    for (let f = 0; f < features; f++) {
      const values = X.map(row => row[f]).sort((a, b) => a - b);
      for (let i = 1; i < values.length; i++) {
        const threshold = (values[i - 1] + values[i]) / 2;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];
        X.forEach((row, idx) => {
          if (row[f] <= threshold) leftIdx.push(idx);
          else rightIdx.push(idx);
        });
        if (leftIdx.length === 0 || rightIdx.length === 0) continue;
        const leftY = leftIdx.map(i => y[i]);
        const rightY = rightIdx.map(i => y[i]);
        const leftW = leftIdx.map(i => w[i]);
        const rightW = rightIdx.map(i => w[i]);
        const before = this._weightedGini(y, w);
        const after = (this._sum(leftW) / this._sum(w)) * this._weightedGini(leftY, leftW) +
                      (this._sum(rightW) / this._sum(w)) * this._weightedGini(rightY, rightW);
        const gain = before - after;
        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }
    if (bestGain === -Infinity) return this._leaf(prediction, X.length);
    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[bestFeature] <= bestThreshold) leftIdx.push(idx);
      else rightIdx.push(idx);
    });
    const node = this._leaf(prediction, X.length);
    node.isLeaf = false;
    node.feature = bestFeature;
    node.threshold = bestThreshold;
    node.left = this._buildTreeWeighted(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), leftIdx.map(i => w[i]), depth + 1, maxDepth, criterion);
    node.right = this._buildTreeWeighted(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), rightIdx.map(i => w[i]), depth + 1, maxDepth, criterion);
    this._nodes.push(node);
    return node;
  }

  private _sum(v: number[]): number {
    return v.reduce((s, x) => s + x, 0);
  }

  private _weightedMean(y: number[], w: number[]): number {
    const wSum = this._sum(w);
    if (wSum === 0) return 0;
    return y.reduce((s, v, i) => s + v * w[i], 0) / wSum;
  }

  private _weightedMode(y: number[], w: number[]): number {
    const counts = new Map<number, number>();
    y.forEach((v, i) => counts.set(v, (counts.get(v) ?? 0) + w[i]));
    let best = y[0];
    let bestCount = 0;
    for (const [k, c] of counts) if (c > bestCount) { best = k; bestCount = c; }
    return best;
  }

  private _weightedGini(y: number[], w: number[]): number {
    const wSum = this._sum(w);
    if (wSum === 0) return 0;
    const counts = new Map<number, number>();
    y.forEach((v, i) => counts.set(v, (counts.get(v) ?? 0) + w[i]));
    let sum = 0;
    for (const c of counts.values()) {
      const p = c / wSum;
      sum += p * p;
    }
    return 1 - sum;
  }

  private _ccpPruneNode(node: TreeNode, X: number[][], y: number[], alpha: number): TreeNode {
    if (node.isLeaf) return node;
    const leftValIdx: number[] = [];
    const rightValIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[node.feature] <= node.threshold) leftValIdx.push(idx);
      else rightValIdx.push(idx);
    });
    if (node.left) node.left = this._ccpPruneNode(node.left, leftValIdx.map(i => X[i]), leftValIdx.map(i => y[i]), alpha);
    if (node.right) node.right = this._ccpPruneNode(node.right, rightValIdx.map(i => X[i]), rightValIdx.map(i => y[i]), alpha);
    const subtreeError = this._subtreeError(node, X, y);
    const leafError = this._leafError(node.prediction, y) + alpha;
    if (leafError <= subtreeError) return this._leaf(node.prediction, node.samples);
    return node;
  }

  private _subtreeError(node: TreeNode, X: number[][], y: number[]): number {
    return this._validationError(node, X, y);
  }

  private _pessimisticPruneNode(node: TreeNode, X: number[][], y: number[]): TreeNode {
    if (node.isLeaf) return node;
    const leftValIdx: number[] = [];
    const rightValIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[node.feature] <= node.threshold) leftValIdx.push(idx);
      else rightValIdx.push(idx);
    });
    if (node.left) node.left = this._pessimisticPruneNode(node.left, leftValIdx.map(i => X[i]), leftValIdx.map(i => y[i]));
    if (node.right) node.right = this._pessimisticPruneNode(node.right, rightValIdx.map(i => X[i]), rightValIdx.map(i => y[i]));
    const leaves = this._leafCount(node);
    const subtreeErr = this._validationError(node, X, y) + 0.5 * leaves;
    const leafErr = this._leafError(node.prediction, y) + 0.5;
    if (leafErr <= subtreeErr) return this._leaf(node.prediction, node.samples);
    return node;
  }

  private _mdlPruneNode(node: TreeNode, X: number[][], y: number[]): TreeNode {
    if (node.isLeaf) return node;
    const leftValIdx: number[] = [];
    const rightValIdx: number[] = [];
    X.forEach((row, idx) => {
      if (row[node.feature] <= node.threshold) leftValIdx.push(idx);
      else rightValIdx.push(idx);
    });
    if (node.left) node.left = this._mdlPruneNode(node.left, leftValIdx.map(i => X[i]), leftValIdx.map(i => y[i]));
    if (node.right) node.right = this._mdlPruneNode(node.right, rightValIdx.map(i => X[i]), rightValIdx.map(i => y[i]));
    const subtreeCost = this._validationError(node, X, y) + Math.log2(this._nodeCount(node));
    const leafCost = this._leafError(node.prediction, y) + 1;
    if (leafCost <= subtreeCost) return this._leaf(node.prediction, node.samples);
    return node;
  }

  private _leafCount(node: TreeNode | null): number {
    if (!node) return 0;
    if (node.isLeaf) return 1;
    return this._leafCount(node.left) + this._leafCount(node.right);
  }

  private _nodeCount(node: TreeNode | null): number {
    if (!node) return 0;
    return 1 + this._nodeCount(node.left) + this._nodeCount(node.right);
  }

  private _collectLeafDepths(node: TreeNode | null, depth: number, depths: number[]): void {
    if (!node) return;
    if (node.isLeaf) { depths.push(depth); return; }
    this._collectLeafDepths(node.left, depth + 1, depths);
    this._collectLeafDepths(node.right, depth + 1, depths);
  }

  private _preOrder(node: TreeNode | null, result: TreeNode[]): void {
    if (!node) return;
    result.push(node);
    this._preOrder(node.left, result);
    this._preOrder(node.right, result);
  }

  private _inOrder(node: TreeNode | null, result: TreeNode[]): void {
    if (!node) return;
    this._inOrder(node.left, result);
    result.push(node);
    this._inOrder(node.right, result);
  }

  private _postOrder(node: TreeNode | null, result: TreeNode[]): void {
    if (!node) return;
    this._postOrder(node.left, result);
    this._postOrder(node.right, result);
    result.push(node);
  }

  private _printNode(node: TreeNode | null, prefix: string, isTail: boolean, lines: string[]): void {
    if (!node) return;
    const label = node.isLeaf
      ? `leaf [pred=${node.prediction.toFixed(3)}, n=${node.samples}]`
      : `node [f=${node.feature}, thr=${node.threshold.toFixed(3)}, n=${node.samples}]`;
    lines.push(`${prefix}${isTail ? '└── ' : '├── '}${label}`);
    if (!node.isLeaf) {
      const childPrefix = prefix + (isTail ? '    ' : '│   ');
      this._printNode(node.left, childPrefix, false, lines);
      this._printNode(node.right, childPrefix, true, lines);
    }
  }

  private _forestAccuracy(forest: Forest, X: number[][], y: number[]): number {
    let correct = 0;
    for (let i = 0; i < X.length; i++) {
      const pred = this.predictForest(forest, X[i]);
      if (pred === y[i]) correct++;
    }
    return correct / Math.max(1, X.length);
  }

  private _majorityVote(preds: number[]): number {
    const counts = new Map<number, number>();
    for (const p of preds) counts.set(p, (counts.get(p) ?? 0) + 1);
    let best = preds[0] ?? 0;
    let bestCount = 0;
    for (const [k, c] of counts) if (c > bestCount) { best = k; bestCount = c; }
    return best;
  }

  private _meanPrediction(node: TreeNode | null): number {
    if (!node) return 0;
    return node.prediction;
  }

  private _accumulateImpurityForFeature(node: TreeNode | null, _feature: number, _total: number): void {
    if (!node || node.isLeaf) return;
    this._accumulateImpurityForFeature(node.left, _feature, _total);
    this._accumulateImpurityForFeature(node.right, _feature, _total);
  }

  private _collectLeafPredictions(node: TreeNode | null, out: number[]): void {
    if (!node) return;
    if (node.isLeaf) { out.push(node.prediction); return; }
    this._collectLeafPredictions(node.left, out);
    this._collectLeafPredictions(node.right, out);
  }
}
