import { DataPacket } from '../shared/types';

export interface SQLColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  primaryKey?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
}

export interface SQLTable {
  name: string;
  columns: SQLColumn[];
  primaryKeys: string[];
  foreignKeys: SQLForeignKey[];
  indexes: string[];
  rowCount: number;
  createdAt: number;
}

export interface SQLForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface ParsedSQL {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'ALTER';
  table?: string;
  columns?: string[];
  values?: Record<string, unknown>[];
  conditions?: SQLCondition[];
  joins?: SQLJoin[];
  orderBy?: SQLOrderBy[];
  groupBy?: string[];
  having?: SQLCondition[];
  limit?: number;
  offset?: number;
  raw: string;
}

export interface SQLCondition {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';
  value?: unknown;
  logic?: 'AND' | 'OR';
}

export interface SQLJoin {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  leftColumn: string;
  rightColumn: string;
}

export interface SQLOrderBy {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  affectedRows: number;
  executionTime: number;
  queryPlan?: ExecutionPlan;
}

export interface ExecutionPlan {
  operation: string;
  table?: string;
  index?: string;
  rowsEstimated: number;
  cost: number;
  children?: ExecutionPlan[];
}

export interface TransactionState {
  id: string;
  status: 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK';
  isolationLevel: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  startTime: number;
  endTime?: number;
  operations: number;
  lockSet: Set<string>;
}

export interface RelationalDatabaseState {
  tables: Map<string, SQLTable>;
  activeTransactions: Map<string, TransactionState>;
  totalQueries: number;
  totalTransactions: number;
  committedTransactions: number;
  rolledBackTransactions: number;
  lastQuery?: ParsedSQL;
  lastResult?: QueryResult;
}

export class RelationalDatabase {
  private _tables: Map<string, SQLTable> = new Map();
  private _activeTransactions: Map<string, TransactionState> = new Map();
  private _totalQueries: number = 0;
  private _totalTransactions: number = 0;
  private _committedTransactions: number = 0;
  private _rolledBackTransactions: number = 0;
  private _lastQuery: ParsedSQL | null = null;
  private _lastResult: QueryResult | null = null;
  private _counter: number = 0;
  private _dataStore: Map<string, Record<string, unknown>[]> = new Map();
  private _systemCatalog: SQLTable;

  constructor() {
    this._systemCatalog = this._createSystemCatalog();
    this._tables.set('__system_catalog', this._systemCatalog);
    this._initializeDefaultTables();
  }

  private _createSystemCatalog(): SQLTable {
    return {
      name: '__system_catalog',
      columns: [
        { name: 'table_name', type: 'VARCHAR(255)', nullable: false, primaryKey: true },
        { name: 'column_count', type: 'INTEGER', nullable: false },
        { name: 'row_count', type: 'INTEGER', nullable: false, defaultValue: '0' },
        { name: 'created_at', type: 'BIGINT', nullable: false },
        { name: 'last_modified', type: 'BIGINT', nullable: false }
      ],
      primaryKeys: ['table_name'],
      foreignKeys: [],
      indexes: ['idx_table_name'],
      rowCount: 0,
      createdAt: Date.now()
    };
  }

  private _initializeDefaultTables(): void {
    this.createTable('users', [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, autoIncrement: true },
      { name: 'username', type: 'VARCHAR(50)', nullable: false, unique: true },
      { name: 'email', type: 'VARCHAR(255)', nullable: false, unique: true },
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: false },
      { name: 'created_at', type: 'BIGINT', nullable: false },
      { name: 'updated_at', type: 'BIGINT', nullable: false }
    ]);

    this.createTable('products', [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, autoIncrement: true },
      { name: 'name', type: 'VARCHAR(255)', nullable: false },
      { name: 'description', type: 'TEXT', nullable: true },
      { name: 'price', type: 'DECIMAL(10,2)', nullable: false },
      { name: 'stock', type: 'INTEGER', nullable: false, defaultValue: '0' },
      { name: 'category_id', type: 'INTEGER', nullable: true },
      { name: 'created_at', type: 'BIGINT', nullable: false }
    ]);

    this.createTable('orders', [
      { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, autoIncrement: true },
      { name: 'user_id', type: 'INTEGER', nullable: false },
      { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: false },
      { name: 'status', type: 'VARCHAR(50)', nullable: false, defaultValue: "'pending'" },
      { name: 'created_at', type: 'BIGINT', nullable: false }
    ]);
  }

  get tables(): Map<string, SQLTable> {
    return this._tables;
  }

  get activeTransactions(): Map<string, TransactionState> {
    return this._activeTransactions;
  }

  get totalQueries(): number {
    return this._totalQueries;
  }

  get totalTransactions(): number {
    return this._totalTransactions;
  }

  get committedTransactions(): number {
    return this._committedTransactions;
  }

  get rolledBackTransactions(): number {
    return this._rolledBackTransactions;
  }

  get lastQuery(): ParsedSQL | null {
    return this._lastQuery;
  }

  get lastResult(): QueryResult | null {
    return this._lastResult;
  }

  get tableCount(): number {
    return this._tables.size;
  }

  createTable(name: string, columns: SQLColumn[]): SQLTable {
    const primaryKeys = columns.filter(c => c.primaryKey).map(c => c.name);
    const table: SQLTable = {
      name,
      columns,
      primaryKeys,
      foreignKeys: [],
      indexes: primaryKeys.map(pk => `idx_${name}_${pk}`),
      rowCount: 0,
      createdAt: Date.now()
    };
    this._tables.set(name, table);
    this._dataStore.set(name, []);
    this._updateSystemCatalog(name, columns.length, 0);
    return table;
  }

  dropTable(name: string): boolean {
    if (!this._tables.has(name) || name === '__system_catalog') {
      return false;
    }
    this._tables.delete(name);
    this._dataStore.delete(name);
    return true;
  }

  addForeignKey(
    tableName: string,
    column: string,
    referencedTable: string,
    referencedColumn: string,
    onDelete: SQLForeignKey['onDelete'] = 'RESTRICT',
    onUpdate: SQLForeignKey['onUpdate'] = 'CASCADE'
  ): boolean {
    const table = this._tables.get(tableName);
    const refTable = this._tables.get(referencedTable);
    if (!table || !refTable) return false;
    if (!table.columns.find(c => c.name === column)) return false;
    if (!refTable.columns.find(c => c.name === referencedColumn)) return false;
    table.foreignKeys.push({ column, referencedTable, referencedColumn, onDelete, onUpdate });
    return true;
  }

  parseSQL(sql: string): ParsedSQL {
    const trimmed = sql.trim().toUpperCase();
    let type: ParsedSQL['type'];
    if (trimmed.startsWith('SELECT')) type = 'SELECT';
    else if (trimmed.startsWith('INSERT')) type = 'INSERT';
    else if (trimmed.startsWith('UPDATE')) type = 'UPDATE';
    else if (trimmed.startsWith('DELETE')) type = 'DELETE';
    else if (trimmed.startsWith('CREATE')) type = 'CREATE';
    else if (trimmed.startsWith('DROP')) type = 'DROP';
    else type = 'ALTER';

    const parsed: ParsedSQL = { type, raw: sql };

    if (type === 'SELECT') {
      parsed.table = this._extractTableName(sql, 'FROM');
      parsed.columns = this._extractColumns(sql);
      parsed.conditions = this._extractConditions(sql);
      parsed.joins = this._extractJoins(sql);
      parsed.orderBy = this._extractOrderBy(sql);
      parsed.groupBy = this._extractGroupBy(sql);
      parsed.limit = this._extractLimit(sql);
      parsed.offset = this._extractOffset(sql);
    } else if (type === 'INSERT') {
      parsed.table = this._extractTableName(sql, 'INTO');
    } else if (type === 'UPDATE') {
      parsed.table = this._extractTableName(sql, 'UPDATE');
      parsed.conditions = this._extractConditions(sql);
    } else if (type === 'DELETE') {
      parsed.table = this._extractTableName(sql, 'FROM');
      parsed.conditions = this._extractConditions(sql);
    }

    this._lastQuery = parsed;
    return parsed;
  }

  private _extractTableName(sql: string, keyword: string): string | undefined {
    const regex = new RegExp(`${keyword}\\s+(\\w+)`, 'i');
    const match = sql.match(regex);
    return match ? match[1] : undefined;
  }

  private _extractColumns(sql: string): string[] {
    const match = sql.match(/SELECT\s+(.*?)\s+FROM/i);
    if (!match) return ['*'];
    if (match[1].trim() === '*') return ['*'];
    return match[1].split(',').map(c => c.trim());
  }

  private _extractConditions(sql: string): SQLCondition[] {
    const conditions: SQLCondition[] = [];
    const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER|GROUP|LIMIT|$)/i);
    if (!whereMatch) return conditions;
    const whereClause = whereMatch[1].trim();
    const parts = whereClause.split(/\s+(AND|OR)\s+/i);
    let logic: 'AND' | 'OR' = 'AND';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part.toUpperCase() === 'AND' || part.toUpperCase() === 'OR') {
        logic = part.toUpperCase() as 'AND' | 'OR';
        continue;
      }
      const eqMatch = part.match(/(\w+)\s*=\s*(.+)/);
      const gtMatch = part.match(/(\w+)\s*>\s*(.+)/);
      const ltMatch = part.match(/(\w+)\s*<\s*(.+)/);
      const likeMatch = part.match(/(\w+)\s+LIKE\s+(.+)/i);
      const nullMatch = part.match(/(\w+)\s+IS\s+NULL/i);
      const notNullMatch = part.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
      if (eqMatch) {
        conditions.push({ column: eqMatch[1], operator: '=', value: this._parseValue(eqMatch[2]), logic });
      } else if (gtMatch) {
        conditions.push({ column: gtMatch[1], operator: '>', value: this._parseValue(gtMatch[2]), logic });
      } else if (ltMatch) {
        conditions.push({ column: ltMatch[1], operator: '<', value: this._parseValue(ltMatch[2]), logic });
      } else if (likeMatch) {
        conditions.push({ column: likeMatch[1], operator: 'LIKE', value: this._parseValue(likeMatch[2]), logic });
      } else if (nullMatch) {
        conditions.push({ column: nullMatch[1], operator: 'IS NULL', logic });
      } else if (notNullMatch) {
        conditions.push({ column: notNullMatch[1], operator: 'IS NOT NULL', logic });
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

  private _extractJoins(sql: string): SQLJoin[] {
    const joins: SQLJoin[] = [];
    const joinRegex = /(INNER|LEFT|RIGHT|FULL)\s+JOIN\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi;
    let match;
    while ((match = joinRegex.exec(sql)) !== null) {
      joins.push({
        type: match[1].toUpperCase() as SQLJoin['type'],
        table: match[2],
        leftColumn: `${match[3]}.${match[4]}`,
        rightColumn: `${match[5]}.${match[6]}`
      });
    }
    return joins;
  }

  private _extractOrderBy(sql: string): SQLOrderBy[] {
    const orderBy: SQLOrderBy[] = [];
    const match = sql.match(/ORDER\s+BY\s+(.*?)(?:LIMIT|$)/i);
    if (!match) return orderBy;
    const parts = match[1].split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      const dirMatch = trimmed.match(/(\w+)\s+(ASC|DESC)/i);
      if (dirMatch) {
        orderBy.push({ column: dirMatch[1], direction: dirMatch[2].toUpperCase() as 'ASC' | 'DESC' });
      } else {
        orderBy.push({ column: trimmed, direction: 'ASC' });
      }
    }
    return orderBy;
  }

  private _extractGroupBy(sql: string): string[] {
    const match = sql.match(/GROUP\s+BY\s+(.*?)(?:HAVING|ORDER|LIMIT|$)/i);
    if (!match) return [];
    return match[1].split(',').map(c => c.trim());
  }

  private _extractLimit(sql: string): number | undefined {
    const match = sql.match(/LIMIT\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private _extractOffset(sql: string): number | undefined {
    const match = sql.match(/OFFSET\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  executeQuery(sql: string): QueryResult {
    const startTime = Date.now();
    const parsed = this.parseSQL(sql);
    this._totalQueries++;
    let rows: Record<string, unknown>[] = [];
    let affectedRows = 0;
    const tableName = parsed.table;

    if (parsed.type === 'SELECT' && tableName && this._dataStore.has(tableName)) {
      rows = this._executeSelect(parsed);
      affectedRows = rows.length;
    } else if (parsed.type === 'INSERT' && tableName && this._dataStore.has(tableName)) {
      affectedRows = this._executeInsert(parsed);
    } else if (parsed.type === 'UPDATE' && tableName && this._dataStore.has(tableName)) {
      affectedRows = this._executeUpdate(parsed);
    } else if (parsed.type === 'DELETE' && tableName && this._dataStore.has(tableName)) {
      affectedRows = this._executeDelete(parsed);
    }

    const executionTime = Date.now() - startTime;
    const queryPlan = this._generateExecutionPlan(parsed, affectedRows);
    const result: QueryResult = { rows, affectedRows, executionTime, queryPlan };
    this._lastResult = result;
    return result;
  }

  private _executeSelect(parsed: ParsedSQL): Record<string, unknown>[] {
    const tableName = parsed.table!;
    let data = [...(this._dataStore.get(tableName) || [])];
    if (parsed.conditions && parsed.conditions.length > 0) {
      data = data.filter(row => this._evaluateConditions(row, parsed.conditions!));
    }
    if (parsed.orderBy && parsed.orderBy.length > 0) {
      data.sort((a, b) => this._compareRows(a, b, parsed.orderBy!));
    }
    if (parsed.offset !== undefined) {
      data = data.slice(parsed.offset);
    }
    if (parsed.limit !== undefined) {
      data = data.slice(0, parsed.limit);
    }
    if (parsed.columns && !parsed.columns.includes('*')) {
      data = data.map(row => {
        const filtered: Record<string, unknown> = {};
        for (const col of parsed.columns!) {
          if (col in row) filtered[col] = row[col];
        }
        return filtered;
      });
    }
    return data;
  }

  private _executeInsert(parsed: ParsedSQL): number {
    const tableName = parsed.table!;
    const table = this._tables.get(tableName);
    if (!table) return 0;
    const data = this._dataStore.get(tableName) || [];
    if (parsed.values && parsed.values.length > 0) {
      for (const val of parsed.values) {
        const row: Record<string, unknown> = { ...val };
        for (const col of table.columns) {
          if (!(col.name in row) && col.defaultValue !== undefined) {
            row[col.name] = col.defaultValue;
          }
          if (col.autoIncrement) {
            row[col.name] = data.length + 1;
          }
        }
        data.push(row);
      }
      table.rowCount = data.length;
      this._updateSystemCatalog(tableName, table.columns.length, data.length);
      return parsed.values.length;
    }
    return 0;
  }

  private _executeUpdate(parsed: ParsedSQL): number {
    const tableName = parsed.table!;
    const data = this._dataStore.get(tableName) || [];
    const table = this._tables.get(tableName);
    let count = 0;
    const updates = parsed.values?.[0] || {};
    for (let i = 0; i < data.length; i++) {
      if (!parsed.conditions || parsed.conditions.length === 0 || this._evaluateConditions(data[i], parsed.conditions)) {
        data[i] = { ...data[i], ...updates };
        count++;
      }
    }
    if (table) {
      this._updateSystemCatalog(tableName, table.columns.length, data.length);
    }
    return count;
  }

  private _executeDelete(parsed: ParsedSQL): number {
    const tableName = parsed.table!;
    const data = this._dataStore.get(tableName) || [];
    const table = this._tables.get(tableName);
    const originalLength = data.length;
    const filtered = data.filter(row => {
      if (!parsed.conditions || parsed.conditions.length === 0) return false;
      return !this._evaluateConditions(row, parsed.conditions);
    });
    this._dataStore.set(tableName, filtered);
    if (table) {
      table.rowCount = filtered.length;
      this._updateSystemCatalog(tableName, table.columns.length, filtered.length);
    }
    return originalLength - filtered.length;
  }

  private _evaluateConditions(row: Record<string, unknown>, conditions: SQLCondition[]): boolean {
    let result = true;
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      const rowValue = row[cond.column];
      let condResult = false;
      switch (cond.operator) {
        case '=':
          condResult = rowValue === cond.value;
          break;
        case '!=':
          condResult = rowValue !== cond.value;
          break;
        case '>':
          condResult = Number(rowValue) > Number(cond.value);
          break;
        case '<':
          condResult = Number(rowValue) < Number(cond.value);
          break;
        case '>=':
          condResult = Number(rowValue) >= Number(cond.value);
          break;
        case '<=':
          condResult = Number(rowValue) <= Number(cond.value);
          break;
        case 'LIKE':
          const pattern = String(cond.value).replace(/%/g, '.*');
          condResult = new RegExp(pattern, 'i').test(String(rowValue));
          break;
        case 'IS NULL':
          condResult = rowValue === null || rowValue === undefined;
          break;
        case 'IS NOT NULL':
          condResult = rowValue !== null && rowValue !== undefined;
          break;
      }
      if (i === 0) {
        result = condResult;
      } else if (cond.logic === 'AND') {
        result = result && condResult;
      } else {
        result = result || condResult;
      }
    }
    return result;
  }

  private _compareRows(a: Record<string, unknown>, b: Record<string, unknown>, orderBy: SQLOrderBy[]): number {
    for (const sort of orderBy) {
      const valA = a[sort.column];
      const valB = b[sort.column];
      if (valA < valB) return sort.direction === 'ASC' ? -1 : 1;
      if (valA > valB) return sort.direction === 'ASC' ? 1 : -1;
    }
    return 0;
  }

  private _generateExecutionPlan(parsed: ParsedSQL, rowCount: number): ExecutionPlan {
    const plan: ExecutionPlan = {
      operation: parsed.type,
      table: parsed.table,
      rowsEstimated: rowCount,
      cost: rowCount * 1.5
    };
    if (parsed.conditions && parsed.conditions.length > 0) {
      plan.children = [{
        operation: 'Filter',
        rowsEstimated: Math.floor(rowCount * 0.3),
        cost: rowCount * 0.5
      }];
    }
    return plan;
  }

  beginTransaction(isolationLevel: TransactionState['isolationLevel'] = 'REPEATABLE READ'): TransactionState {
    const id = `tx-${Date.now()}-${++this._counter}`;
    const tx: TransactionState = {
      id,
      status: 'ACTIVE',
      isolationLevel,
      startTime: Date.now(),
      operations: 0,
      lockSet: new Set()
    };
    this._activeTransactions.set(id, tx);
    this._totalTransactions++;
    return tx;
  }

  commitTransaction(transactionId: string): boolean {
    const tx = this._activeTransactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') return false;
    tx.status = 'COMMITTED';
    tx.endTime = Date.now();
    this._activeTransactions.delete(transactionId);
    this._committedTransactions++;
    return true;
  }

  rollbackTransaction(transactionId: string): boolean {
    const tx = this._activeTransactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') return false;
    tx.status = 'ROLLED_BACK';
    tx.endTime = Date.now();
    this._activeTransactions.delete(transactionId);
    this._rolledBackTransactions++;
    return true;
  }

  insert(tableName: string, data: Record<string, unknown>): number {
    const table = this._tables.get(tableName);
    const store = this._dataStore.get(tableName);
    if (!table || !store) return 0;
    const row: Record<string, unknown> = { ...data };
    for (const col of table.columns) {
      if (col.autoIncrement) {
        row[col.name] = store.length + 1;
      } else if (!(col.name in row) && col.defaultValue !== undefined) {
        row[col.name] = col.defaultValue;
      }
    }
    store.push(row);
    table.rowCount = store.length;
    this._updateSystemCatalog(tableName, table.columns.length, store.length);
    return 1;
  }

  select(tableName: string, conditions?: Record<string, unknown>): Record<string, unknown>[] {
    const store = this._dataStore.get(tableName);
    if (!store) return [];
    if (!conditions || Object.keys(conditions).length === 0) {
      return [...store];
    }
    return store.filter(row => {
      for (const [key, value] of Object.entries(conditions)) {
        if (row[key] !== value) return false;
      }
      return true;
    });
  }

  getTableInfo(tableName: string): SQLTable | undefined {
    return this._tables.get(tableName);
  }

  listTables(): string[] {
    return Array.from(this._tables.keys()).filter(t => !t.startsWith('__'));
  }

  truncateTable(tableName: string): boolean {
    const table = this._tables.get(tableName);
    const store = this._dataStore.get(tableName);
    if (!table || !store) return false;
    store.length = 0;
    table.rowCount = 0;
    this._updateSystemCatalog(tableName, table.columns.length, 0);
    return true;
  }

  validateSchema(tableName: string, data: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const table = this._tables.get(tableName);
    const errors: string[] = [];
    if (!table) {
      errors.push(`Table '${tableName}' does not exist`);
      return { valid: false, errors };
    }
    for (const col of table.columns) {
      if (!col.nullable && !(col.name in data) && !col.defaultValue && !col.autoIncrement) {
        errors.push(`Column '${col.name}' is required but not provided`);
      }
    }
    for (const key of Object.keys(data)) {
      if (!table.columns.find(c => c.name === key)) {
        errors.push(`Column '${key}' does not exist in table '${tableName}'`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  private _updateSystemCatalog(tableName: string, columnCount: number, rowCount: number): void {
    const catalogData = this._dataStore.get('__system_catalog');
    if (!catalogData) return;
    const existing = catalogData.find(r => r['table_name'] === tableName);
    const now = Date.now();
    if (existing) {
      existing['column_count'] = columnCount;
      existing['row_count'] = rowCount;
      existing['last_modified'] = now;
    } else {
      catalogData.push({
        table_name: tableName,
        column_count: columnCount,
        row_count: rowCount,
        created_at: now,
        last_modified: now
      });
    }
    const catalogTable = this._tables.get('__system_catalog');
    if (catalogTable) {
      catalogTable.rowCount = catalogData.length;
    }
  }

  getStatistics(): {
    tableCount: number;
    totalRows: number;
    totalQueries: number;
    totalTransactions: number;
    committedPct: number;
  } {
    let totalRows = 0;
    for (const table of this._tables.values()) {
      totalRows += table.rowCount;
    }
    const committedPct = this._totalTransactions > 0
      ? (this._committedTransactions / this._totalTransactions) * 100
      : 0;
    return {
      tableCount: this._tables.size,
      totalRows,
      totalQueries: this._totalQueries,
      totalTransactions: this._totalTransactions,
      committedPct
    };
  }

  toPacket(): DataPacket<RelationalDatabaseState> {
    const state: RelationalDatabaseState = {
      tables: this._tables,
      activeTransactions: this._activeTransactions,
      totalQueries: this._totalQueries,
      totalTransactions: this._totalTransactions,
      committedTransactions: this._committedTransactions,
      rolledBackTransactions: this._rolledBackTransactions,
      lastQuery: this._lastQuery || undefined,
      lastResult: this._lastResult || undefined
    };
    this._counter++;
    return {
      id: `relational-db-${Date.now()}-${this._counter}`,
      payload: state,
      metadata: {
        createdAt: Date.now(),
        route: ['database', 'relational'],
        priority: 1,
        phase: 'data-storage'
      }
    };
  }

  reset(): void {
    this._tables.clear();
    this._activeTransactions.clear();
    this._dataStore.clear();
    this._totalQueries = 0;
    this._totalTransactions = 0;
    this._committedTransactions = 0;
    this._rolledBackTransactions = 0;
    this._lastQuery = null;
    this._lastResult = null;
    this._counter = 0;
    this._systemCatalog = this._createSystemCatalog();
    this._tables.set('__system_catalog', this._systemCatalog);
    this._dataStore.set('__system_catalog', []);
    this._initializeDefaultTables();
  }
}
