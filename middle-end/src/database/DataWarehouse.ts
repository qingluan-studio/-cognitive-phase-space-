import { DataPacket } from '../shared/types';

export type DimensionType = 'TIME' | 'GEOGRAPHY' | 'PRODUCT' | 'CUSTOMER' | 'SLOWLY_CHANGING';
export type FactType = 'TRANSACTIONAL' | 'ACCUMULATING' | 'PERIODIC' | 'FACTLESS';
export type SCDType = 'TYPE_1' | 'TYPE_2' | 'TYPE_3' | 'TYPE_4';
export type ETLPhase = 'EXTRACT' | 'TRANSFORM' | 'LOAD' | 'VALIDATE' | 'COMPLETE';
export type OLAPOperation = 'SLICE' | 'DICE' | 'ROLL_UP' | 'DRILL_DOWN' | 'PIVOT';

export interface DimensionTable {
  name: string;
  type: DimensionType;
  columns: DimensionColumn[];
  primaryKey: string;
  surrogateKey?: string;
  naturalKey: string;
  scdType: SCDType;
  rowCount: number;
  sizeBytes: number;
}

export interface DimensionColumn {
  name: string;
  type: string;
  isAttribute: boolean;
  isHierarchy?: boolean;
  hierarchyLevel?: number;
  description?: string;
}

export interface FactTable {
  name: string;
  type: FactType;
  columns: FactColumn[];
  dimensionKeys: string[];
  measures: string[];
  grain: string;
  rowCount: number;
  sizeBytes: number;
}

export interface FactColumn {
  name: string;
  type: string;
  isMeasure: boolean;
  isDimensionKey: boolean;
  aggregation?: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';
  description?: string;
}

export interface ETLJob {
  id: string;
  name: string;
  source: string;
  target: string;
  phase: ETLPhase;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startTime?: number;
  endTime?: number;
  rowsExtracted: number;
  rowsTransformed: number;
  rowsLoaded: number;
  errors: string[];
  transformations: string[];
}

export interface DataMart {
  name: string;
  description: string;
  domain: string;
  factTables: string[];
  dimensionTables: string[];
  owner: string;
  createdAt: number;
  lastUpdated: number;
  queryCount: number;
}

export interface OLAPCube {
  name: string;
  factTable: string;
  dimensions: CubeDimension[];
  measures: CubeMeasure[];
  aggregations: Map<string, number>;
  materialized: boolean;
  lastRefresh: number;
}

export interface CubeDimension {
  name: string;
  table: string;
  hierarchies: CubeHierarchy[];
}

export interface CubeHierarchy {
  name: string;
  levels: string[];
}

export interface CubeMeasure {
  name: string;
  column: string;
  aggregation: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT_COUNT';
  format?: string;
}

export interface OLAPQuery {
  cube: string;
  dimensions: string[];
  measures: string[];
  filters: Record<string, unknown>;
  operation: OLAPOperation;
  rollupLevel?: string;
}

export interface OLAPResult {
  headers: string[];
  rows: Array<Record<string, unknown>>;
  totalRows: number;
  executionTime: number;
  aggregationUsed: string;
}

export interface DataWarehouseStatistics {
  totalDimensions: number;
  totalFacts: number;
  totalDataMarts: number;
  totalCubes: number;
  totalSizeBytes: number;
  totalETLJobs: number;
  completedETLJobs: number;
  failedETLJobs: number;
  avgETLDuration: number;
  queryCount: number;
}

export interface DataWarehouseState {
  statistics: DataWarehouseStatistics;
  dimensions: Map<string, DimensionTable>;
  facts: Map<string, FactTable>;
  dataMarts: Map<string, DataMart>;
  lastETLJob?: ETLJob;
  lastOLAPQuery?: OLAPResult;
}

export class DataWarehouse {
  private _dimensions: Map<string, DimensionTable> = new Map();
  private _facts: Map<string, FactTable> = new Map();
  private _dataMarts: Map<string, DataMart> = new Map();
  private _cubes: Map<string, OLAPCube> = new Map();
  private _etlJobs: Map<string, ETLJob> = new Map();
  private _totalETLDuration: number = 0;
  private _queryCount: number = 0;
  private _counter: number = 0;
  private _lastETLJob: ETLJob | null = null;
  private _lastOLAPResult: OLAPResult | null = null;

  constructor() {
    this._initializeDefaultSchema();
  }

  private _initializeDefaultSchema(): void {
    const dimDate: DimensionTable = {
      name: 'dim_date',
      type: 'TIME',
      columns: [
        { name: 'date_key', type: 'INTEGER', isAttribute: true, description: 'YYYYMMDD format' },
        { name: 'full_date', type: 'DATE', isAttribute: true },
        { name: 'day_of_week', type: 'INTEGER', isAttribute: true, isHierarchy: true, hierarchyLevel: 4 },
        { name: 'day_name', type: 'VARCHAR(20)', isAttribute: true },
        { name: 'week_of_year', type: 'INTEGER', isAttribute: true, isHierarchy: true, hierarchyLevel: 3 },
        { name: 'month', type: 'INTEGER', isAttribute: true, isHierarchy: true, hierarchyLevel: 2 },
        { name: 'month_name', type: 'VARCHAR(20)', isAttribute: true },
        { name: 'quarter', type: 'INTEGER', isAttribute: true, isHierarchy: true, hierarchyLevel: 1 },
        { name: 'year', type: 'INTEGER', isAttribute: true, isHierarchy: true, hierarchyLevel: 0 }
      ],
      primaryKey: 'date_key',
      naturalKey: 'full_date',
      scdType: 'TYPE_1',
      rowCount: 3650,
      sizeBytes: 3650 * 256
    };
    this._dimensions.set('dim_date', dimDate);

    const dimProduct: DimensionTable = {
      name: 'dim_product',
      type: 'PRODUCT',
      columns: [
        { name: 'product_key', type: 'INTEGER', isAttribute: true },
        { name: 'product_id', type: 'INTEGER', isAttribute: true },
        { name: 'product_name', type: 'VARCHAR(255)', isAttribute: true },
        { name: 'category', type: 'VARCHAR(100)', isAttribute: true, isHierarchy: true, hierarchyLevel: 2 },
        { name: 'subcategory', type: 'VARCHAR(100)', isAttribute: true, isHierarchy: true, hierarchyLevel: 1 },
        { name: 'brand', type: 'VARCHAR(100)', isAttribute: true },
        { name: 'price', type: 'DECIMAL(10,2)', isAttribute: true },
        { name: 'effective_start', type: 'DATE', isAttribute: true },
        { name: 'effective_end', type: 'DATE', isAttribute: true },
        { name: 'is_current', type: 'BOOLEAN', isAttribute: true },
        { name: 'version', type: 'INTEGER', isAttribute: true }
      ],
      primaryKey: 'product_key',
      surrogateKey: 'product_key',
      naturalKey: 'product_id',
      scdType: 'TYPE_2',
      rowCount: 5000,
      sizeBytes: 5000 * 512
    };
    this._dimensions.set('dim_product', dimProduct);

    const dimCustomer: DimensionTable = {
      name: 'dim_customer',
      type: 'CUSTOMER',
      columns: [
        { name: 'customer_key', type: 'INTEGER', isAttribute: true },
        { name: 'customer_id', type: 'INTEGER', isAttribute: true },
        { name: 'first_name', type: 'VARCHAR(100)', isAttribute: true },
        { name: 'last_name', type: 'VARCHAR(100)', isAttribute: true },
        { name: 'email', type: 'VARCHAR(255)', isAttribute: true },
        { name: 'city', type: 'VARCHAR(100)', isAttribute: true, isHierarchy: true, hierarchyLevel: 2 },
        { name: 'state', type: 'VARCHAR(100)', isAttribute: true, isHierarchy: true, hierarchyLevel: 1 },
        { name: 'country', type: 'VARCHAR(100)', isAttribute: true, isHierarchy: true, hierarchyLevel: 0 },
        { name: 'segment', type: 'VARCHAR(50)', isAttribute: true },
        { name: 'signup_date', type: 'DATE', isAttribute: true }
      ],
      primaryKey: 'customer_key',
      surrogateKey: 'customer_key',
      naturalKey: 'customer_id',
      scdType: 'TYPE_1',
      rowCount: 10000,
      sizeBytes: 10000 * 384
    };
    this._dimensions.set('dim_customer', dimCustomer);

    const factSales: FactTable = {
      name: 'fact_sales',
      type: 'TRANSACTIONAL',
      columns: [
        { name: 'sale_id', type: 'BIGINT', isMeasure: false, isDimensionKey: false },
        { name: 'date_key', type: 'INTEGER', isMeasure: false, isDimensionKey: true },
        { name: 'product_key', type: 'INTEGER', isMeasure: false, isDimensionKey: true },
        { name: 'customer_key', type: 'INTEGER', isMeasure: false, isDimensionKey: true },
        { name: 'quantity', type: 'INTEGER', isMeasure: true, isDimensionKey: false, aggregation: 'SUM' },
        { name: 'unit_price', type: 'DECIMAL(10,2)', isMeasure: true, isDimensionKey: false, aggregation: 'AVG' },
        { name: 'total_amount', type: 'DECIMAL(12,2)', isMeasure: true, isDimensionKey: false, aggregation: 'SUM' },
        { name: 'discount_amount', type: 'DECIMAL(10,2)', isMeasure: true, isDimensionKey: false, aggregation: 'SUM' },
        { name: 'tax_amount', type: 'DECIMAL(10,2)', isMeasure: true, isDimensionKey: false, aggregation: 'SUM' },
        { name: 'profit', type: 'DECIMAL(10,2)', isMeasure: true, isDimensionKey: false, aggregation: 'SUM' }
      ],
      dimensionKeys: ['date_key', 'product_key', 'customer_key'],
      measures: ['quantity', 'unit_price', 'total_amount', 'discount_amount', 'tax_amount', 'profit'],
      grain: 'individual sale transaction',
      rowCount: 500000,
      sizeBytes: 500000 * 256
    };
    this._facts.set('fact_sales', factSales);

    const factInventory: FactTable = {
      name: 'fact_inventory',
      type: 'PERIODIC',
      columns: [
        { name: 'date_key', type: 'INTEGER', isMeasure: false, isDimensionKey: true },
        { name: 'product_key', type: 'INTEGER', isMeasure: false, isDimensionKey: true },
        { name: 'warehouse_key', type: 'INTEGER', isMeasure: false, isDimensionKey: true },
        { name: 'quantity_on_hand', type: 'INTEGER', isMeasure: true, isDimensionKey: false, aggregation: 'SUM' },
        { name: 'quantity_reserved', type: 'INTEGER', isMeasure: true, isDimensionKey: false, aggregation: 'SUM' },
        { name: 'reorder_level', type: 'INTEGER', isMeasure: true, isDimensionKey: false, aggregation: 'MIN' },
        { name: 'stock_value', type: 'DECIMAL(12,2)', isMeasure: true, isDimensionKey: false, aggregation: 'SUM' }
      ],
      dimensionKeys: ['date_key', 'product_key', 'warehouse_key'],
      measures: ['quantity_on_hand', 'quantity_reserved', 'reorder_level', 'stock_value'],
      grain: 'daily inventory snapshot per product per warehouse',
      rowCount: 250000,
      sizeBytes: 250000 * 192
    };
    this._facts.set('fact_inventory', factInventory);

    const salesMart: DataMart = {
      name: 'sales_mart',
      description: 'Sales performance and analysis data mart',
      domain: 'Sales',
      factTables: ['fact_sales'],
      dimensionTables: ['dim_date', 'dim_product', 'dim_customer'],
      owner: 'sales_analytics',
      createdAt: Date.now() - 86400000 * 365,
      lastUpdated: Date.now(),
      queryCount: 15000
    };
    this._dataMarts.set('sales_mart', salesMart);

    const inventoryMart: DataMart = {
      name: 'inventory_mart',
      description: 'Inventory management and optimization data mart',
      domain: 'Supply Chain',
      factTables: ['fact_inventory'],
      dimensionTables: ['dim_date', 'dim_product'],
      owner: 'operations',
      createdAt: Date.now() - 86400000 * 180,
      lastUpdated: Date.now(),
      queryCount: 8000
    };
    this._dataMarts.set('inventory_mart', inventoryMart);

    const salesCube: OLAPCube = {
      name: 'sales_cube',
      factTable: 'fact_sales',
      dimensions: [
        {
          name: 'Date',
          table: 'dim_date',
          hierarchies: [
            { name: 'Calendar', levels: ['year', 'quarter', 'month', 'week_of_year', 'day_of_week'] }
          ]
        },
        {
          name: 'Product',
          table: 'dim_product',
          hierarchies: [
            { name: 'Category', levels: ['category', 'subcategory', 'product_name'] }
          ]
        },
        {
          name: 'Customer',
          table: 'dim_customer',
          hierarchies: [
            { name: 'Geography', levels: ['country', 'state', 'city'] }
          ]
        }
      ],
      measures: [
        { name: 'Total Sales', column: 'total_amount', aggregation: 'SUM', format: '$#,##0.00' },
        { name: 'Units Sold', column: 'quantity', aggregation: 'SUM' },
        { name: 'Average Price', column: 'unit_price', aggregation: 'AVG', format: '$#,##0.00' },
        { name: 'Total Profit', column: 'profit', aggregation: 'SUM', format: '$#,##0.00' },
        { name: 'Transaction Count', column: 'sale_id', aggregation: 'DISTINCT_COUNT' }
      ],
      aggregations: new Map([
        ['yearly_total', 12],
        ['monthly_total', 365],
        ['daily_total', 3650]
      ]),
      materialized: true,
      lastRefresh: Date.now()
    };
    this._cubes.set('sales_cube', salesCube);
  }

  get dimensionCount(): number {
    return this._dimensions.size;
  }

  get factCount(): number {
    return this._facts.size;
  }

  get dataMartCount(): number {
    return this._dataMarts.size;
  }

  get cubeCount(): number {
    return this._cubes.size;
  }

  get totalSizeBytes(): number {
    let total = 0;
    for (const dim of this._dimensions.values()) total += dim.sizeBytes;
    for (const fact of this._facts.values()) total += fact.sizeBytes;
    return total;
  }

  get totalETLJobs(): number {
    return this._etlJobs.size;
  }

  get completedETLJobs(): number {
    let count = 0;
    for (const job of this._etlJobs.values()) {
      if (job.status === 'COMPLETED') count++;
    }
    return count;
  }

  get failedETLJobs(): number {
    let count = 0;
    for (const job of this._etlJobs.values()) {
      if (job.status === 'FAILED') count++;
    }
    return count;
  }

  get avgETLDuration(): number {
    return this._etlJobs.size > 0 ? this._totalETLDuration / this._etlJobs.size : 0;
  }

  get queryCount(): number {
    return this._queryCount;
  }

  get lastETLJob(): ETLJob | null {
    return this._lastETLJob;
  }

  get lastOLAPResult(): OLAPResult | null {
    return this._lastOLAPResult;
  }

  get statistics(): DataWarehouseStatistics {
    return {
      totalDimensions: this._dimensions.size,
      totalFacts: this._facts.size,
      totalDataMarts: this._dataMarts.size,
      totalCubes: this._cubes.size,
      totalSizeBytes: this.totalSizeBytes,
      totalETLJobs: this._etlJobs.size,
      completedETLJobs: this.completedETLJobs,
      failedETLJobs: this.failedETLJobs,
      avgETLDuration: this.avgETLDuration,
      queryCount: this._queryCount
    };
  }

  addDimension(dimension: DimensionTable): boolean {
    if (this._dimensions.has(dimension.name)) return false;
    this._dimensions.set(dimension.name, dimension);
    return true;
  }

  addFactTable(fact: FactTable): boolean {
    if (this._facts.has(fact.name)) return false;
    this._facts.set(fact.name, fact);
    return true;
  }

  addDataMart(mart: DataMart): boolean {
    if (this._dataMarts.has(mart.name)) return false;
    this._dataMarts.set(mart.name, mart);
    return true;
  }

  addCube(cube: OLAPCube): boolean {
    if (this._cubes.has(cube.name)) return false;
    this._cubes.set(cube.name, cube);
    return true;
  }

  getDimension(name: string): DimensionTable | undefined {
    return this._dimensions.get(name);
  }

  getFactTable(name: string): FactTable | undefined {
    return this._facts.get(name);
  }

  getDataMart(name: string): DataMart | undefined {
    return this._dataMarts.get(name);
  }

  getCube(name: string): OLAPCube | undefined {
    return this._cubes.get(name);
  }

  listDimensions(): string[] {
    return Array.from(this._dimensions.keys());
  }

  listFactTables(): string[] {
    return Array.from(this._facts.keys());
  }

  listDataMarts(): string[] {
    return Array.from(this._dataMarts.keys());
  }

  listCubes(): string[] {
    return Array.from(this._cubes.keys());
  }

  startETLJob(name: string, source: string, target: string, transformations: string[] = []): ETLJob {
    const id = `etl-${Date.now()}-${++this._counter}`;
    const job: ETLJob = {
      id,
      name,
      source,
      target,
      phase: 'EXTRACT',
      status: 'RUNNING',
      startTime: Date.now(),
      rowsExtracted: 0,
      rowsTransformed: 0,
      rowsLoaded: 0,
      errors: [],
      transformations
    };
    this._etlJobs.set(id, job);
    this._lastETLJob = job;
    return job;
  }

  updateETLPhase(jobId: string, phase: ETLPhase, rowsProcessed: number = 0): boolean {
    const job = this._etlJobs.get(jobId);
    if (!job || job.status !== 'RUNNING') return false;

    job.phase = phase;

    switch (phase) {
      case 'EXTRACT':
        job.rowsExtracted = rowsProcessed;
        break;
      case 'TRANSFORM':
        job.rowsTransformed = rowsProcessed;
        break;
      case 'LOAD':
        job.rowsLoaded = rowsProcessed;
        break;
      case 'VALIDATE':
        break;
      case 'COMPLETE':
        job.status = 'COMPLETED';
        job.endTime = Date.now();
        if (job.startTime) {
          this._totalETLDuration += job.endTime - job.startTime;
        }
        break;
    }

    this._lastETLJob = job;
    return true;
  }

  failETLJob(jobId: string, error: string): boolean {
    const job = this._etlJobs.get(jobId);
    if (!job) return false;
    job.status = 'FAILED';
    job.endTime = Date.now();
    job.errors.push(error);
    if (job.startTime) {
      this._totalETLDuration += job.endTime - job.startTime;
    }
    this._lastETLJob = job;
    return true;
  }

  getETLJob(jobId: string): ETLJob | undefined {
    return this._etlJobs.get(jobId);
  }

  executeOLAPQuery(query: OLAPQuery): OLAPResult {
    const startTime = Date.now();
    this._queryCount++;

    const cube = this._cubes.get(query.cube);
    const fact = cube ? this._facts.get(cube.factTable) : undefined;

    const headers = [...query.dimensions, ...query.measures];
    const rows: Array<Record<string, unknown>> = [];

    const baseRows = fact ? Math.min(fact.rowCount, 100) : 10;
    for (let i = 0; i < baseRows; i++) {
      const row: Record<string, unknown> = {};
      for (const dim of query.dimensions) {
        row[dim] = `${dim}_value_${i % 10}`;
      }
      for (const measure of query.measures) {
        row[measure] = Math.floor(Math.random() * 10000);
      }
      rows.push(row);
    }

    let aggregationUsed = 'full_scan';
    if (cube && cube.materialized) {
      const matchingAgg = Array.from(cube.aggregations.keys()).find(
        agg => agg.includes(query.rollupLevel?.toLowerCase() || '')
      );
      if (matchingAgg) aggregationUsed = matchingAgg;
    }

    const result: OLAPResult = {
      headers,
      rows,
      totalRows: rows.length,
      executionTime: Date.now() - startTime,
      aggregationUsed
    };

    this._lastOLAPResult = result;

    for (const mart of this._dataMarts.values()) {
      if (mart.factTables.includes(query.cube) || cube && mart.factTables.includes(cube.factTable)) {
        mart.queryCount++;
        mart.lastUpdated = Date.now();
      }
    }

    return result;
  }

  slice(cubeName: string, dimension: string, value: unknown): OLAPResult {
    return this.executeOLAPQuery({
      cube: cubeName,
      dimensions: [dimension],
      measures: ['Total Sales', 'Units Sold'],
      filters: { [dimension]: value },
      operation: 'SLICE'
    });
  }

  dice(cubeName: string, filters: Record<string, unknown>): OLAPResult {
    return this.executeOLAPQuery({
      cube: cubeName,
      dimensions: [],
      measures: ['Total Sales', 'Units Sold', 'Total Profit'],
      filters,
      operation: 'DICE'
    });
  }

  rollUp(cubeName: string, dimension: string, fromLevel: string, toLevel: string): OLAPResult {
    return this.executeOLAPQuery({
      cube: cubeName,
      dimensions: [dimension],
      measures: ['Total Sales', 'Units Sold'],
      filters: {},
      operation: 'ROLL_UP',
      rollupLevel: toLevel
    });
  }

  drillDown(cubeName: string, dimension: string, fromLevel: string, toLevel: string): OLAPResult {
    return this.executeOLAPQuery({
      cube: cubeName,
      dimensions: [dimension],
      measures: ['Total Sales', 'Units Sold'],
      filters: {},
      operation: 'DRILL_DOWN',
      rollupLevel: toLevel
    });
  }

  refreshCube(cubeName: string): boolean {
    const cube = this._cubes.get(cubeName);
    if (!cube) return false;
    cube.lastRefresh = Date.now();
    return true;
  }

  getStarSchema(factName: string): { fact: FactTable; dimensions: DimensionTable[] } | null {
    const fact = this._facts.get(factName);
    if (!fact) return null;
    const dimensions: DimensionTable[] = [];
    for (const dimKey of fact.dimensionKeys) {
      const dimName = dimKey.replace('_key', '');
      for (const dim of this._dimensions.values()) {
        if (dim.primaryKey === dimKey || dim.name.includes(dimName)) {
          dimensions.push(dim);
          break;
        }
      }
    }
    return { fact, dimensions };
  }

  validateSchema(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const fact of this._facts.values()) {
      for (const dimKey of fact.dimensionKeys) {
        let found = false;
        for (const dim of this._dimensions.values()) {
          if (dim.primaryKey === dimKey) {
            found = true;
            break;
          }
        }
        if (!found) {
          issues.push(`Dimension key '${dimKey}' in fact '${fact.name}' has no matching dimension`);
        }
      }
    }
    return { valid: issues.length === 0, issues };
  }

  toPacket(): DataPacket<DataWarehouseState> {
    const state: DataWarehouseState = {
      statistics: this.statistics,
      dimensions: this._dimensions,
      facts: this._facts,
      dataMarts: this._dataMarts,
      lastETLJob: this._lastETLJob || undefined,
      lastOLAPQuery: this._lastOLAPResult || undefined
    };
    this._counter++;
    return {
      id: `data-warehouse-${Date.now()}-${this._counter}`,
      payload: state,
      metadata: {
        createdAt: Date.now(),
        route: ['database', 'data-warehouse'],
        priority: 1,
        phase: 'data-warehousing'
      }
    };
  }

  reset(): void {
    this._dimensions.clear();
    this._facts.clear();
    this._dataMarts.clear();
    this._cubes.clear();
    this._etlJobs.clear();
    this._totalETLDuration = 0;
    this._queryCount = 0;
    this._counter = 0;
    this._lastETLJob = null;
    this._lastOLAPResult = null;
    this._initializeDefaultSchema();
  }
}
