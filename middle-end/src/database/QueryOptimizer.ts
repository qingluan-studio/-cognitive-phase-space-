import { DataPacket } from '../shared/types';

export type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'AGGREGATE';

export interface QueryCondition {
  column: string;
  operator: string;
  value: unknown;
  selectivity?: number;
}

export interface TableStatistics {
  tableName: string;
  rowCount: number;
  pageCount: number;
  averageRowSize: number;
  columnStats: Map<string, ColumnStatistics>;
  indexStats: Map<string, IndexStats>;
  lastUpdated: number;
}

export interface ColumnStatistics {
  columnName: string;
  distinctValues: number;
  nullCount: number;
  minValue: unknown;
  maxValue: unknown;
  histogram: number[];
  mostCommonValues: Array<{ value: unknown; frequency: number }>;
}

export interface IndexStats {
  indexName: string;
  type: string;
  unique: boolean;
  height: number;
  leafPages: number;
  clusteringFactor: number;
  selectivity: number;
}

export interface ExecutionPlanNode {
  id: string;
  operation: string;
  tableName?: string;
  indexName?: string;
  estimatedRows: number;
  estimatedCost: number;
  actualRows?: number;
  actualCost?: number;
  conditions?: QueryCondition[];
  joinType?: string;
  joinKey?: string;
  sortKey?: string[];
  children: ExecutionPlanNode[];
}

export interface CostEstimate {
  ioCost: number;
  cpuCost: number;
  totalCost: number;
  rowsEstimated: number;
}

export interface OptimizerConfiguration {
  enableIndexScan: boolean;
  enableNestedLoopJoin: boolean;
  enableHashJoin: boolean;
  enableMergeJoin: boolean;
  costModel: 'io' | 'cpu' | 'hybrid';
  optimizerGoal: 'all_rows' | 'first_rows';
  maxParallelism: number;
  enablePredicatePushdown: boolean;
  enableProjectionPushdown: boolean;
}

export interface QueryOptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  executionPlan: ExecutionPlanNode;
  estimatedCost: CostEstimate;
  optimizationTime: number;
  transformationsApplied: string[];
}

export interface QueryOptimizerState {
  configuration: OptimizerConfiguration;
  tableStatistics: Map<string, TableStatistics>;
  totalOptimizations: number;
  averageOptimizationTime: number;
  lastOptimization?: QueryOptimizationResult;
}

export class QueryOptimizer {
  private _configuration: OptimizerConfiguration;
  private _tableStatistics: Map<string, TableStatistics> = new Map();
  private _totalOptimizations: number = 0;
  private _totalOptimizationTime: number = 0;
  private _lastOptimization: QueryOptimizationResult | null = null;
  private _counter: number = 0;
  private _planCache: Map<string, ExecutionPlanNode> = new Map();
  private _cacheHits: number = 0;
  private _cacheMisses: number = 0;

  constructor() {
    this._configuration = this._getDefaultConfiguration();
    this._initializeDefaultStatistics();
  }

  private _getDefaultConfiguration(): OptimizerConfiguration {
    return {
      enableIndexScan: true,
      enableNestedLoopJoin: true,
      enableHashJoin: true,
      enableMergeJoin: true,
      costModel: 'hybrid',
      optimizerGoal: 'all_rows',
      maxParallelism: 4,
      enablePredicatePushdown: true,
      enableProjectionPushdown: true
    };
  }

  private _initializeDefaultStatistics(): void {
    const userCols = new Map<string, ColumnStatistics>();
    userCols.set('id', {
      columnName: 'id',
      distinctValues: 10000,
      nullCount: 0,
      minValue: 1,
      maxValue: 10000,
      histogram: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000],
      mostCommonValues: []
    });
    userCols.set('username', {
      columnName: 'username',
      distinctValues: 9800,
      nullCount: 0,
      minValue: 'a',
      maxValue: 'z',
      histogram: [500, 1200, 1000, 1100, 900, 1300, 800, 1200, 1000, 1000],
      mostCommonValues: [{ value: 'admin', frequency: 50 }]
    });
    userCols.set('email', {
      columnName: 'email',
      distinctValues: 10000,
      nullCount: 0,
      minValue: 'a@a.com',
      maxValue: 'z@z.com',
      histogram: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000],
      mostCommonValues: []
    });
    userCols.set('status', {
      columnName: 'status',
      distinctValues: 5,
      nullCount: 100,
      minValue: 'active',
      maxValue: 'suspended',
      histogram: [6000, 2000, 1000, 500, 400],
      mostCommonValues: [
        { value: 'active', frequency: 6000 },
        { value: 'inactive', frequency: 2000 }
      ]
    });
    const userIdx = new Map<string, IndexStats>();
    userIdx.set('idx_user_id', {
      indexName: 'idx_user_id',
      type: 'BPLUSTREE',
      unique: true,
      height: 3,
      leafPages: 50,
      clusteringFactor: 0.95,
      selectivity: 0.0001
    });
    userIdx.set('idx_username', {
      indexName: 'idx_username',
      type: 'BPLUSTREE',
      unique: true,
      height: 3,
      leafPages: 48,
      clusteringFactor: 0.9,
      selectivity: 0.0001
    });
    const userStats: TableStatistics = {
      tableName: 'users',
      rowCount: 10000,
      pageCount: 200,
      averageRowSize: 256,
      columnStats: userCols,
      indexStats: userIdx,
      lastUpdated: Date.now()
    };
    this._tableStatistics.set('users', userStats);

    const productCols = new Map<string, ColumnStatistics>();
    productCols.set('id', {
      columnName: 'id',
      distinctValues: 5000,
      nullCount: 0,
      minValue: 1,
      maxValue: 5000,
      histogram: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500],
      mostCommonValues: []
    });
    productCols.set('category_id', {
      columnName: 'category_id',
      distinctValues: 20,
      nullCount: 50,
      minValue: 1,
      maxValue: 20,
      histogram: [500, 400, 300, 350, 200, 250, 150, 300, 400, 500],
      mostCommonValues: [
        { value: 1, frequency: 500 },
        { value: 10, frequency: 500 }
      ]
    });
    productCols.set('price', {
      columnName: 'price',
      distinctValues: 1500,
      nullCount: 0,
      minValue: 9.99,
      maxValue: 9999.99,
      histogram: [800, 1200, 1000, 700, 500, 300, 200, 150, 100, 50],
      mostCommonValues: []
    });
    const productIdx = new Map<string, IndexStats>();
    productIdx.set('idx_product_id', {
      indexName: 'idx_product_id',
      type: 'BPLUSTREE',
      unique: true,
      height: 2,
      leafPages: 25,
      clusteringFactor: 0.85,
      selectivity: 0.0002
    });
    productIdx.set('idx_category', {
      indexName: 'idx_category',
      type: 'BPLUSTREE',
      unique: false,
      height: 2,
      leafPages: 15,
      clusteringFactor: 0.7,
      selectivity: 0.05
    });
    const productStats: TableStatistics = {
      tableName: 'products',
      rowCount: 5000,
      pageCount: 100,
      averageRowSize: 512,
      columnStats: productCols,
      indexStats: productIdx,
      lastUpdated: Date.now()
    };
    this._tableStatistics.set('products', productStats);

    const orderCols = new Map<string, ColumnStatistics>();
    orderCols.set('id', {
      columnName: 'id',
      distinctValues: 50000,
      nullCount: 0,
      minValue: 1,
      maxValue: 50000,
      histogram: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
      mostCommonValues: []
    });
    orderCols.set('user_id', {
      columnName: 'user_id',
      distinctValues: 8000,
      nullCount: 0,
      minValue: 1,
      maxValue: 10000,
      histogram: [3000, 5000, 6000, 5500, 4500, 5000, 6000, 5000, 4000, 6000],
      mostCommonValues: []
    });
    orderCols.set('status', {
      columnName: 'status',
      distinctValues: 6,
      nullCount: 0,
      minValue: 'pending',
      maxValue: 'cancelled',
      histogram: [15000, 20000, 8000, 4000, 2000, 1000],
      mostCommonValues: [
        { value: 'completed', frequency: 20000 },
        { value: 'pending', frequency: 15000 }
      ]
    });
    const orderIdx = new Map<string, IndexStats>();
    orderIdx.set('idx_order_id', {
      indexName: 'idx_order_id',
      type: 'BPLUSTREE',
      unique: true,
      height: 3,
      leafPages: 200,
      clusteringFactor: 0.98,
      selectivity: 0.00002
    });
    orderIdx.set('idx_user_order', {
      indexName: 'idx_user_order',
      type: 'BPLUSTREE',
      unique: false,
      height: 3,
      leafPages: 120,
      clusteringFactor: 0.8,
      selectivity: 0.00125
    });
    const orderStats: TableStatistics = {
      tableName: 'orders',
      rowCount: 50000,
      pageCount: 1000,
      averageRowSize: 128,
      columnStats: orderCols,
      indexStats: orderIdx,
      lastUpdated: Date.now()
    };
    this._tableStatistics.set('orders', orderStats);
  }

  get configuration(): OptimizerConfiguration {
    return { ...this._configuration };
  }

  get tableStatistics(): Map<string, TableStatistics> {
    return this._tableStatistics;
  }

  get totalOptimizations(): number {
    return this._totalOptimizations;
  }

  get averageOptimizationTime(): number {
    return this._totalOptimizations > 0 ? this._totalOptimizationTime / this._totalOptimizations : 0;
  }

  get lastOptimization(): QueryOptimizationResult | null {
    return this._lastOptimization;
  }

  get cacheHitRate(): number {
    const total = this._cacheHits + this._cacheMisses;
    return total > 0 ? (this._cacheHits / total) * 100 : 0;
  }

  optimizeQuery(query: string): QueryOptimizationResult {
    const startTime = Date.now();
    const transformations: string[] = [];
    let optimizedQuery = query;

    const cacheKey = this._generateCacheKey(query);
    const cachedPlan = this._planCache.get(cacheKey);
    if (cachedPlan) {
      this._cacheHits++;
      const result: QueryOptimizationResult = {
        originalQuery: query,
        optimizedQuery,
        executionPlan: cachedPlan,
        estimatedCost: this._estimatePlanCost(cachedPlan),
        optimizationTime: Date.now() - startTime,
        transformationsApplied: ['plan_cache_hit']
      };
      this._lastOptimization = result;
      this._totalOptimizations++;
      this._totalOptimizationTime += result.optimizationTime;
      return result;
    }
    this._cacheMisses++;

    if (this._configuration.enablePredicatePushdown) {
      optimizedQuery = this._applyPredicatePushdown(optimizedQuery);
      transformations.push('predicate_pushdown');
    }

    if (this._configuration.enableProjectionPushdown) {
      optimizedQuery = this._applyProjectionPushdown(optimizedQuery);
      transformations.push('projection_pushdown');
    }

    optimizedQuery = this._rearrangeConditions(optimizedQuery);
    transformations.push('condition_rearrangement');

    const executionPlan = this._generateExecutionPlan(optimizedQuery);
    const optimizedPlan = this._optimizeJoinOrder(executionPlan);
    const finalPlan = this._chooseAccessMethods(optimizedPlan);

    const cost = this._estimatePlanCost(finalPlan);

    if (this._planCache.size > 1000) {
      const firstKey = this._planCache.keys().next().value;
      if (firstKey) this._planCache.delete(firstKey);
    }
    this._planCache.set(cacheKey, finalPlan);

    const optimizationTime = Date.now() - startTime;
    const result: QueryOptimizationResult = {
      originalQuery: query,
      optimizedQuery,
      executionPlan: finalPlan,
      estimatedCost: cost,
      optimizationTime,
      transformationsApplied: transformations
    };

    this._lastOptimization = result;
    this._totalOptimizations++;
    this._totalOptimizationTime += optimizationTime;
    this._counter++;

    return result;
  }

  private _generateCacheKey(query: string): string {
    return query.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private _applyPredicatePushdown(query: string): string {
    return query;
  }

  private _applyProjectionPushdown(query: string): string {
    return query;
  }

  private _rearrangeConditions(query: string): string {
    return query;
  }

  private _generateExecutionPlan(query: string): ExecutionPlanNode {
    const root: ExecutionPlanNode = {
      id: 'node-0',
      operation: 'SELECT',
      estimatedRows: 1000,
      estimatedCost: 500,
      children: []
    };

    const fromMatch = query.match(/FROM\s+(\w+)/i);
    const whereMatch = query.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
    const joinMatch = query.match(/JOIN\s+(\w+)\s+ON\s+(\w+\.\w+)\s*=\s*(\w+\.\w+)/i);

    if (fromMatch) {
      const tableName = fromMatch[1];
      const tableStats = this._tableStatistics.get(tableName);
      const scanNode: ExecutionPlanNode = {
        id: 'node-1',
        operation: 'SEQ_SCAN',
        tableName,
        estimatedRows: tableStats?.rowCount || 1000,
        estimatedCost: tableStats?.pageCount || 100,
        children: []
      };

      if (whereMatch && tableStats) {
        const conditions = this._parseConditions(whereMatch[1]);
        scanNode.conditions = conditions;
        scanNode.estimatedRows = this._estimateFilterRows(tableStats, conditions);
        scanNode.estimatedCost = scanNode.estimatedCost * 1.1;
      }

      root.children.push(scanNode);

      if (joinMatch) {
        const joinTable = joinMatch[1];
        const joinTableStats = this._tableStatistics.get(joinTable);
        const joinNode: ExecutionPlanNode = {
          id: 'node-2',
          operation: 'NESTED_LOOP_JOIN',
          joinType: 'INNER',
          joinKey: joinMatch[2],
          estimatedRows: (tableStats?.rowCount || 1000) * (joinTableStats?.rowCount || 1000),
          estimatedCost: 5000,
          children: [
            scanNode,
            {
              id: 'node-3',
              operation: 'SEQ_SCAN',
              tableName: joinTable,
              estimatedRows: joinTableStats?.rowCount || 1000,
              estimatedCost: joinTableStats?.pageCount || 100,
              children: []
            }
          ]
        };
        root.children = [joinNode];
      }
    }

    return root;
  }

  private _parseConditions(whereClause: string): QueryCondition[] {
    const conditions: QueryCondition[] = [];
    const parts = whereClause.split(/\s+(AND|OR)\s+/i);
    for (const part of parts) {
      const eqMatch = part.match(/(\w+)\s*=\s*(.+)/);
      const gtMatch = part.match(/(\w+)\s*>\s*(.+)/);
      const ltMatch = part.match(/(\w+)\s*<\s*(.+)/);
      const likeMatch = part.match(/(\w+)\s+LIKE\s+(.+)/i);
      if (eqMatch) {
        conditions.push({ column: eqMatch[1], operator: '=', value: this._parseValue(eqMatch[2]) });
      } else if (gtMatch) {
        conditions.push({ column: gtMatch[1], operator: '>', value: this._parseValue(gtMatch[2]) });
      } else if (ltMatch) {
        conditions.push({ column: ltMatch[1], operator: '<', value: this._parseValue(ltMatch[2]) });
      } else if (likeMatch) {
        conditions.push({ column: likeMatch[1], operator: 'LIKE', value: this._parseValue(likeMatch[2]) });
      }
    }
    return conditions;
  }

  private _parseValue(val: string): unknown {
    const trimmed = val.trim();
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1);
    }
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    return trimmed;
  }

  private _estimateFilterRows(tableStats: TableStatistics, conditions: QueryCondition[]): number {
    let selectivity = 1;
    for (const cond of conditions) {
      const colStats = tableStats.columnStats.get(cond.column);
      if (colStats) {
        if (cond.operator === '=' && colStats.distinctValues > 0) {
          selectivity *= 1 / colStats.distinctValues;
        } else if (cond.operator === '>' || cond.operator === '<') {
          selectivity *= 0.3;
        } else if (cond.operator === 'LIKE') {
          selectivity *= 0.1;
        } else {
          selectivity *= 0.5;
        }
        cond.selectivity = selectivity;
      } else {
        selectivity *= 0.3;
      }
    }
    return Math.max(1, Math.floor(tableStats.rowCount * selectivity));
  }

  private _optimizeJoinOrder(plan: ExecutionPlanNode): ExecutionPlanNode {
    return plan;
  }

  private _chooseAccessMethods(plan: ExecutionPlanNode): ExecutionPlanNode {
    const optimized = { ...plan };
    if (optimized.operation === 'SEQ_SCAN' && optimized.tableName && this._configuration.enableIndexScan) {
      const tableStats = this._tableStatistics.get(optimized.tableName);
      if (tableStats && optimized.conditions && optimized.conditions.length > 0) {
        for (const cond of optimized.conditions) {
          const idxName = this._findBestIndex(tableStats, cond);
          if (idxName) {
            const idxStats = tableStats.indexStats.get(idxName);
            if (idxStats) {
              const indexScanCost = this._estimateIndexScanCost(tableStats, idxStats, optimized.estimatedRows);
              if (indexScanCost < optimized.estimatedCost) {
                optimized.operation = 'INDEX_SCAN';
                optimized.indexName = idxName;
                optimized.estimatedCost = indexScanCost;
                break;
              }
            }
          }
        }
      }
    }
    optimized.children = optimized.children.map(child => this._chooseAccessMethods(child));
    return optimized;
  }

  private _findBestIndex(tableStats: TableStatistics, condition: QueryCondition): string | null {
    let bestIndex: string | null = null;
    let bestSelectivity = 1;
    for (const [idxName, idxStats] of tableStats.indexStats) {
      const colMatch = idxName.includes(condition.column);
      if (colMatch && idxStats.selectivity < bestSelectivity) {
        bestSelectivity = idxStats.selectivity;
        bestIndex = idxName;
      }
    }
    return bestIndex;
  }

  private _estimateIndexScanCost(tableStats: TableStatistics, idxStats: IndexStats, rows: number): number {
    const indexPages = idxStats.leafPages;
    const tablePages = tableStats.pageCount;
    const ioCost = idxStats.height + (rows / tableStats.rowCount) * indexPages;
    const clusteringCost = idxStats.clusteringFactor * (rows / tableStats.rowCount) * tablePages;
    return ioCost * 2 + clusteringCost * 1.5;
  }

  private _estimatePlanCost(plan: ExecutionPlanNode): CostEstimate {
    let ioCost = plan.estimatedCost;
    let cpuCost = plan.estimatedRows * 0.1;
    for (const child of plan.children) {
      const childCost = this._estimatePlanCost(child);
      ioCost += childCost.ioCost;
      cpuCost += childCost.cpuCost;
    }
    let totalCost: number;
    if (this._configuration.costModel === 'io') {
      totalCost = ioCost;
    } else if (this._configuration.costModel === 'cpu') {
      totalCost = cpuCost;
    } else {
      totalCost = ioCost + cpuCost;
    }
    return {
      ioCost,
      cpuCost,
      totalCost,
      rowsEstimated: plan.estimatedRows
    };
  }

  estimateSelectivity(tableName: string, column: string, operator: string, value: unknown): number {
    const tableStats = this._tableStatistics.get(tableName);
    if (!tableStats) return 0.5;
    const colStats = tableStats.columnStats.get(column);
    if (!colStats) return 0.5;
    if (operator === '=') {
      return 1 / colStats.distinctValues;
    } else if (operator === '>' || operator === '<' || operator === '>=' || operator === '<=') {
      return 0.3;
    } else if (operator === 'LIKE') {
      return 0.1;
    } else if (operator === 'IN') {
      return Array.isArray(value) ? value.length / colStats.distinctValues : 0.1;
    }
    return 0.5;
  }

  updateStatistics(tableName: string, stats: Partial<TableStatistics>): boolean {
    const existing = this._tableStatistics.get(tableName);
    if (!existing) return false;
    this._tableStatistics.set(tableName, { ...existing, ...stats, lastUpdated: Date.now() });
    return true;
  }

  getTableStatistics(tableName: string): TableStatistics | undefined {
    return this._tableStatistics.get(tableName);
  }

  comparePlans(plan1: ExecutionPlanNode, plan2: ExecutionPlanNode): { better: string; costDiff: number } {
    const cost1 = this._estimatePlanCost(plan1);
    const cost2 = this._estimatePlanCost(plan2);
    return {
      better: cost1.totalCost < cost2.totalCost ? 'plan1' : 'plan2',
      costDiff: Math.abs(cost1.totalCost - cost2.totalCost)
    };
  }

  setConfiguration(config: Partial<OptimizerConfiguration>): void {
    this._configuration = { ...this._configuration, ...config };
  }

  clearPlanCache(): void {
    this._planCache.clear();
    this._cacheHits = 0;
    this._cacheMisses = 0;
  }

  explainPlan(query: string): string {
    const result = this.optimizeQuery(query);
    return this._formatPlanTree(result.executionPlan, 0);
  }

  private _formatPlanTree(node: ExecutionPlanNode, depth: number): string {
    const indent = '  '.repeat(depth);
    let line = `${indent}${node.operation}`;
    if (node.tableName) line += ` on ${node.tableName}`;
    if (node.indexName) line += ` using ${node.indexName}`;
    line += ` (rows=${node.estimatedRows}, cost=${node.estimatedCost.toFixed(2)})`;
    let result = line;
    for (const child of node.children) {
      result += '\n' + this._formatPlanTree(child, depth + 1);
    }
    return result;
  }

  getOptimizerStats(): {
    totalOptimizations: number;
    averageTime: number;
    cacheHitRate: number;
    planCacheSize: number;
  } {
    return {
      totalOptimizations: this._totalOptimizations,
      averageTime: this.averageOptimizationTime,
      cacheHitRate: this.cacheHitRate,
      planCacheSize: this._planCache.size
    };
  }

  toPacket(): DataPacket<QueryOptimizerState> {
    const state: QueryOptimizerState = {
      configuration: this._configuration,
      tableStatistics: this._tableStatistics,
      totalOptimizations: this._totalOptimizations,
      averageOptimizationTime: this.averageOptimizationTime,
      lastOptimization: this._lastOptimization || undefined
    };
    this._counter++;
    return {
      id: `query-optimizer-${Date.now()}-${this._counter}`,
      payload: state,
      metadata: {
        createdAt: Date.now(),
        route: ['database', 'query-optimizer'],
        priority: 1,
        phase: 'query-optimization'
      }
    };
  }

  reset(): void {
    this._configuration = this._getDefaultConfiguration();
    this._tableStatistics.clear();
    this._totalOptimizations = 0;
    this._totalOptimizationTime = 0;
    this._lastOptimization = null;
    this._counter = 0;
    this._planCache.clear();
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._initializeDefaultStatistics();
  }
}
