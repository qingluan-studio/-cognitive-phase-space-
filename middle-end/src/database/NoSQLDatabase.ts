import { DataPacket } from '../shared/types';

export type NoSQLDatabaseType = 'key-value' | 'document' | 'column-family' | 'graph';

export interface KeyValueEntry {
  key: string;
  value: unknown;
  version: number;
  createdAt: number;
  updatedAt: number;
  ttl?: number;
}

export interface DocumentEntry {
  _id: string;
  data: Record<string, unknown>;
  version: number;
  createdAt: number;
  updatedAt: number;
  collection: string;
}

export interface ColumnFamilyRow {
  rowKey: string;
  columns: Map<string, { value: unknown; timestamp: number }>;
  createdAt: number;
  updatedAt: number;
}

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  properties: Record<string, unknown>;
  createdAt: number;
  weight?: number;
}

export interface NoSQLQuery {
  type: 'GET' | 'SET' | 'DELETE' | 'QUERY' | 'SCAN' | 'AGGREGATE';
  target: string;
  filters?: Record<string, unknown>;
  options?: NoSQLOptions;
}

export interface NoSQLOptions {
  limit?: number;
  offset?: number;
  sort?: { field: string; order: 'asc' | 'desc' }[];
  projection?: string[];
  consistentRead?: boolean;
}

export interface NoSQLQueryResult {
  items: unknown[];
  count: number;
  scannedCount: number;
  executionTime: number;
  cursor?: string;
}

export interface NoSQLDatabaseStats {
  type: NoSQLDatabaseType;
  totalEntries: number;
  totalCollections: number;
  memoryUsage: number;
  hitRate: number;
  totalOperations: number;
  readOperations: number;
  writeOperations: number;
  deleteOperations: number;
}

export interface NoSQLDatabaseState {
  type: NoSQLDatabaseType;
  stats: NoSQLDatabaseStats;
  lastQuery?: NoSQLQuery;
  lastResult?: NoSQLQueryResult;
}

export class NoSQLDatabase {
  private _type: NoSQLDatabaseType;
  private _keyValueStore: Map<string, KeyValueEntry> = new Map();
  private _documentCollections: Map<string, Map<string, DocumentEntry>> = new Map();
  private _columnFamilies: Map<string, Map<string, ColumnFamilyRow>> = new Map();
  private _graphNodes: Map<string, GraphNode> = new Map();
  private _graphEdges: Map<string, GraphEdge> = new Map();
  private _totalOperations: number = 0;
  private _readOperations: number = 0;
  private _writeOperations: number = 0;
  private _deleteOperations: number = 0;
  private _lastQuery: NoSQLQuery | null = null;
  private _lastResult: NoSQLQueryResult | null = null;
  private _counter: number = 0;
  private _hitCount: number = 0;
  private _missCount: number = 0;
  private _defaultCollection: string = 'default';

  constructor(type: NoSQLDatabaseType = 'document') {
    this._type = type;
    this._initializeCollections();
  }

  private _initializeCollections(): void {
    if (this._type === 'document') {
      this._documentCollections.set('users', new Map());
      this._documentCollections.set('products', new Map());
      this._documentCollections.set('orders', new Map());
      this._documentCollections.set('sessions', new Map());
    } else if (this._type === 'key-value') {
      this._keyValueStore.set('config:theme', {
        key: 'config:theme',
        value: 'dark',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } else if (this._type === 'column-family') {
      this._columnFamilies.set('users', new Map());
      this._columnFamilies.set('products', new Map());
    } else if (this._type === 'graph') {
      this._initializeDefaultGraph();
    }
  }

  private _initializeDefaultGraph(): void {
    const nodes: GraphNode[] = [
      { id: 'user:1', label: 'User', properties: { name: 'Alice', age: 30 }, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'user:2', label: 'User', properties: { name: 'Bob', age: 25 }, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'product:1', label: 'Product', properties: { name: 'Laptop', price: 999 }, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'product:2', label: 'Product', properties: { name: 'Phone', price: 699 }, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'order:1', label: 'Order', properties: { total: 1698, status: 'completed' }, createdAt: Date.now(), updatedAt: Date.now() }
    ];
    const edges: GraphEdge[] = [
      { id: 'edge:1', sourceId: 'user:1', targetId: 'order:1', label: 'PLACED', properties: { date: Date.now() }, createdAt: Date.now() },
      { id: 'edge:2', sourceId: 'order:1', targetId: 'product:1', label: 'CONTAINS', properties: { quantity: 1 }, createdAt: Date.now() },
      { id: 'edge:3', sourceId: 'order:1', targetId: 'product:2', label: 'CONTAINS', properties: { quantity: 1 }, createdAt: Date.now() },
      { id: 'edge:4', sourceId: 'user:1', targetId: 'user:2', label: 'FRIENDS_WITH', properties: { since: Date.now() }, createdAt: Date.now() }
    ];
    for (const node of nodes) {
      this._graphNodes.set(node.id, node);
    }
    for (const edge of edges) {
      this._graphEdges.set(edge.id, edge);
    }
  }

  get type(): NoSQLDatabaseType {
    return this._type;
  }

  get totalEntries(): number {
    switch (this._type) {
      case 'key-value': return this._keyValueStore.size;
      case 'document':
        let total = 0;
        for (const coll of this._documentCollections.values()) total += coll.size;
        return total;
      case 'column-family':
        let cfTotal = 0;
        for (const cf of this._columnFamilies.values()) cfTotal += cf.size;
        return cfTotal;
      case 'graph': return this._graphNodes.size + this._graphEdges.size;
    }
  }

  get totalCollections(): number {
    switch (this._type) {
      case 'key-value': return 1;
      case 'document': return this._documentCollections.size;
      case 'column-family': return this._columnFamilies.size;
      case 'graph': return 2;
    }
  }

  get totalOperations(): number {
    return this._totalOperations;
  }

  get hitRate(): number {
    const total = this._hitCount + this._missCount;
    return total > 0 ? (this._hitCount / total) * 100 : 0;
  }

  get lastQuery(): NoSQLQuery | null {
    return this._lastQuery;
  }

  get lastResult(): NoSQLQueryResult | null {
    return this._lastResult;
  }

  get(key: string): KeyValueEntry | undefined {
    this._totalOperations++;
    this._readOperations++;
    const entry = this._keyValueStore.get(key);
    if (entry) {
      if (entry.ttl && Date.now() > entry.createdAt + entry.ttl * 1000) {
        this._keyValueStore.delete(key);
        this._missCount++;
        return undefined;
      }
      this._hitCount++;
    } else {
      this._missCount++;
    }
    return entry;
  }

  set(key: string, value: unknown, ttl?: number): KeyValueEntry {
    this._totalOperations++;
    this._writeOperations++;
    const now = Date.now();
    const existing = this._keyValueStore.get(key);
    const entry: KeyValueEntry = {
      key,
      value,
      version: existing ? existing.version + 1 : 1,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      ttl
    };
    this._keyValueStore.set(key, entry);
    return entry;
  }

  delete(key: string): boolean {
    this._totalOperations++;
    this._deleteOperations++;
    return this._keyValueStore.delete(key);
  }

  getDocument(collection: string, id: string): DocumentEntry | undefined {
    this._totalOperations++;
    this._readOperations++;
    const coll = this._documentCollections.get(collection);
    if (!coll) {
      this._missCount++;
      return undefined;
    }
    const doc = coll.get(id);
    if (doc) {
      this._hitCount++;
    } else {
      this._missCount++;
    }
    return doc;
  }

  insertDocument(collection: string, data: Record<string, unknown>): DocumentEntry {
    this._totalOperations++;
    this._writeOperations++;
    if (!this._documentCollections.has(collection)) {
      this._documentCollections.set(collection, new Map());
    }
    const coll = this._documentCollections.get(collection)!;
    const id = data._id as string || `doc-${Date.now()}-${++this._counter}`;
    const now = Date.now();
    const doc: DocumentEntry = {
      _id: id,
      data: { ...data, _id: id },
      version: 1,
      createdAt: now,
      updatedAt: now,
      collection
    };
    coll.set(id, doc);
    return doc;
  }

  updateDocument(collection: string, id: string, updates: Record<string, unknown>): DocumentEntry | undefined {
    this._totalOperations++;
    this._writeOperations++;
    const coll = this._documentCollections.get(collection);
    if (!coll) return undefined;
    const doc = coll.get(id);
    if (!doc) return undefined;
    const updated: DocumentEntry = {
      ...doc,
      data: { ...doc.data, ...updates },
      version: doc.version + 1,
      updatedAt: Date.now()
    };
    coll.set(id, updated);
    return updated;
  }

  deleteDocument(collection: string, id: string): boolean {
    this._totalOperations++;
    this._deleteOperations++;
    const coll = this._documentCollections.get(collection);
    if (!coll) return false;
    return coll.delete(id);
  }

  queryDocuments(collection: string, filters: Record<string, unknown>, options?: NoSQLOptions): DocumentEntry[] {
    this._totalOperations++;
    this._readOperations++;
    const coll = this._documentCollections.get(collection);
    if (!coll) return [];
    let results: DocumentEntry[] = [];
    for (const doc of coll.values()) {
      let match = true;
      for (const [key, value] of Object.entries(filters)) {
        if (key.startsWith('$')) continue;
        const docValue = this._getNestedValue(doc.data, key);
        if (typeof value === 'object' && value !== null) {
          const ops = value as Record<string, unknown>;
          for (const [op, opVal] of Object.entries(ops)) {
            if (op === '$gt' && !(Number(docValue) > Number(opVal))) match = false;
            if (op === '$gte' && !(Number(docValue) >= Number(opVal))) match = false;
            if (op === '$lt' && !(Number(docValue) < Number(opVal))) match = false;
            if (op === '$lte' && !(Number(docValue) <= Number(opVal))) match = false;
            if (op === '$ne' && !(docValue !== opVal)) match = false;
            if (op === '$in' && !Array.isArray(opVal) && !(opVal as unknown[]).includes(docValue)) match = false;
            if (op === '$regex' && docValue && opVal && !(new RegExp(String(opVal)).test(String(docValue)))) match = false;
          }
        } else if (docValue !== value) {
          match = false;
        }
        if (!match) break;
      }
      if (match) results.push(doc);
    }
    if (options?.sort && options.sort.length > 0) {
      results.sort((a, b) => {
        for (const sort of options.sort!) {
          const valA = this._getNestedValue(a.data, sort.field);
          const valB = this._getNestedValue(b.data, sort.field);
          if (valA < valB) return sort.order === 'asc' ? -1 : 1;
          if (valA > valB) return sort.order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    const scannedCount = results.length;
    if (options?.offset !== undefined) {
      results = results.slice(options.offset);
    }
    if (options?.limit !== undefined) {
      results = results.slice(0, options.limit);
    }
    const query: NoSQLQuery = { type: 'QUERY', target: collection, filters, options };
    const result: NoSQLQueryResult = { items: results, count: results.length, scannedCount, executionTime: 0 };
    this._lastQuery = query;
    this._lastResult = result;
    return results;
  }

  private _getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  addNode(id: string, label: string, properties: Record<string, unknown> = {}): GraphNode {
    this._totalOperations++;
    this._writeOperations++;
    const now = Date.now();
    const node: GraphNode = { id, label, properties, createdAt: now, updatedAt: now };
    this._graphNodes.set(id, node);
    return node;
  }

  addEdge(sourceId: string, targetId: string, label: string, properties: Record<string, unknown> = {}, weight?: number): GraphEdge | null {
    this._totalOperations++;
    this._writeOperations++;
    if (!this._graphNodes.has(sourceId) || !this._graphNodes.has(targetId)) {
      return null;
    }
    const id = `edge-${Date.now()}-${++this._counter}`;
    const edge: GraphEdge = { id, sourceId, targetId, label, properties, createdAt: Date.now(), weight };
    this._graphEdges.set(id, edge);
    return edge;
  }

  getNode(id: string): GraphNode | undefined {
    this._totalOperations++;
    this._readOperations++;
    const node = this._graphNodes.get(id);
    if (node) this._hitCount++;
    else this._missCount++;
    return node;
  }

  getNeighbors(nodeId: string, label?: string): GraphNode[] {
    this._totalOperations++;
    this._readOperations++;
    const neighbors: GraphNode[] = [];
    const seen = new Set<string>();
    for (const edge of this._graphEdges.values()) {
      let neighborId: string | null = null;
      if (edge.sourceId === nodeId) {
        neighborId = edge.targetId;
      } else if (edge.targetId === nodeId) {
        neighborId = edge.sourceId;
      }
      if (neighborId && !seen.has(neighborId)) {
        if (!label || edge.label === label) {
          const node = this._graphNodes.get(neighborId);
          if (node) {
            neighbors.push(node);
            seen.add(neighborId);
          }
        }
      }
    }
    return neighbors;
  }

  getEdges(nodeId: string, label?: string): GraphEdge[] {
    const edges: GraphEdge[] = [];
    for (const edge of this._graphEdges.values()) {
      if ((edge.sourceId === nodeId || edge.targetId === nodeId) && (!label || edge.label === label)) {
        edges.push(edge);
      }
    }
    return edges;
  }

  breadthFirstSearch(startId: string, maxDepth: number = 3): { node: GraphNode; depth: number }[] {
    this._totalOperations++;
    this._readOperations++;
    const results: { node: GraphNode; depth: number }[] = [];
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      const node = this._graphNodes.get(current.id);
      if (node) {
        results.push({ node, depth: current.depth });
      }
      if (current.depth < maxDepth) {
        const neighbors = this.getNeighbors(current.id);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.id)) {
            queue.push({ id: neighbor.id, depth: current.depth + 1 });
          }
        }
      }
    }
    return results;
  }

  shortestPath(startId: string, endId: string): string[] | null {
    this._totalOperations++;
    this._readOperations++;
    if (startId === endId) return [startId];
    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === endId) return current.path;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      const neighbors = this.getNeighbors(current.id);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          queue.push({ id: neighbor.id, path: [...current.path, neighbor.id] });
        }
      }
    }
    return null;
  }

  setColumn(cfName: string, rowKey: string, columnName: string, value: unknown): void {
    this._totalOperations++;
    this._writeOperations++;
    if (!this._columnFamilies.has(cfName)) {
      this._columnFamilies.set(cfName, new Map());
    }
    const cf = this._columnFamilies.get(cfName)!;
    const now = Date.now();
    if (!cf.has(rowKey)) {
      cf.set(rowKey, {
        rowKey,
        columns: new Map(),
        createdAt: now,
        updatedAt: now
      });
    }
    const row = cf.get(rowKey)!;
    row.columns.set(columnName, { value, timestamp: now });
    row.updatedAt = now;
  }

  getColumn(cfName: string, rowKey: string, columnName: string): unknown {
    this._totalOperations++;
    this._readOperations++;
    const cf = this._columnFamilies.get(cfName);
    if (!cf) {
      this._missCount++;
      return undefined;
    }
    const row = cf.get(rowKey);
    if (!row) {
      this._missCount++;
      return undefined;
    }
    const col = row.columns.get(columnName);
    if (col) {
      this._hitCount++;
      return col.value;
    }
    this._missCount++;
    return undefined;
  }

  getRow(cfName: string, rowKey: string): ColumnFamilyRow | undefined {
    this._totalOperations++;
    this._readOperations++;
    const cf = this._columnFamilies.get(cfName);
    if (!cf) return undefined;
    return cf.get(rowKey);
  }

  scanColumnFamily(cfName: string, options?: NoSQLOptions): ColumnFamilyRow[] {
    this._totalOperations++;
    this._readOperations++;
    const cf = this._columnFamilies.get(cfName);
    if (!cf) return [];
    let rows = Array.from(cf.values());
    const scannedCount = rows.length;
    if (options?.offset !== undefined) {
      rows = rows.slice(options.offset);
    }
    if (options?.limit !== undefined) {
      rows = rows.slice(0, options.limit);
    }
    return rows;
  }

  createCollection(name: string): boolean {
    if (this._documentCollections.has(name)) return false;
    this._documentCollections.set(name, new Map());
    return true;
  }

  listCollections(): string[] {
    return Array.from(this._documentCollections.keys());
  }

  countDocuments(collection: string): number {
    const coll = this._documentCollections.get(collection);
    return coll ? coll.size : 0;
  }

  aggregate(collection: string, pipeline: Array<Record<string, unknown>>): Record<string, unknown>[] {
    this._totalOperations++;
    this._readOperations++;
    const coll = this._documentCollections.get(collection);
    if (!coll) return [];
    let data = Array.from(coll.values()).map(d => d.data);
    for (const stage of pipeline) {
      if (stage['$match']) {
        const match = stage['$match'] as Record<string, unknown>;
        data = data.filter(doc => {
          for (const [key, value] of Object.entries(match)) {
            if (this._getNestedValue(doc, key) !== value) return false;
          }
          return true;
        });
      } else if (stage['$group']) {
        const group = stage['$group'] as Record<string, unknown>;
        const groups = new Map<string, Record<string, unknown>>();
        const groupBy = group['_id'] as string;
        for (const doc of data) {
          const key = String(this._getNestedValue(doc, groupBy));
          if (!groups.has(key)) {
            groups.set(key, { _id: this._getNestedValue(doc, groupBy), count: 0 });
          }
          const g = groups.get(key)!;
          g['count'] = (g['count'] as number) + 1;
          for (const [outKey, expr] of Object.entries(group)) {
            if (outKey === '_id') continue;
            const exp = expr as Record<string, unknown>;
            if (exp['$sum']) {
              const sumKey = exp['$sum'] as string;
              const val = Number(this._getNestedValue(doc, sumKey === '1' ? 'count' : sumKey)) || 0;
              g[outKey] = (g[outKey] as number || 0) + val;
            }
            if (exp['$avg']) {
              const avgKey = exp['$avg'] as string;
              const val = Number(this._getNestedValue(doc, avgKey)) || 0;
              if (!g['__sum' + outKey]) {
                g['__sum' + outKey] = 0;
                g['__count' + outKey] = 0;
              }
              g['__sum' + outKey] = (g['__sum' + outKey] as number) + val;
              g['__count' + outKey] = (g['__count' + outKey] as number) + 1;
              g[outKey] = (g['__sum' + outKey] as number) / (g['__count' + outKey] as number);
            }
          }
        }
        data = Array.from(groups.values());
      } else if (stage['$sort']) {
        const sort = stage['$sort'] as Record<string, 1 | -1>;
        data.sort((a, b) => {
          for (const [key, order] of Object.entries(sort)) {
            const valA = this._getNestedValue(a, key);
            const valB = this._getNestedValue(b, key);
            if (valA < valB) return order === 1 ? -1 : 1;
            if (valA > valB) return order === 1 ? 1 : -1;
          }
          return 0;
        });
      } else if (stage['$limit']) {
        data = data.slice(0, stage['$limit'] as number);
      } else if (stage['$skip']) {
        data = data.slice(stage['$skip'] as number);
      }
    }
    return data;
  }

  bulkSet(entries: Array<{ key: string; value: unknown; ttl?: number }>): number {
    let count = 0;
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.ttl);
      count++;
    }
    return count;
  }

  bulkDelete(keys: string[]): number {
    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) count++;
    }
    return count;
  }

  getStats(): NoSQLDatabaseStats {
    return {
      type: this._type,
      totalEntries: this.totalEntries,
      totalCollections: this.totalCollections,
      memoryUsage: this.totalEntries * 1024,
      hitRate: this.hitRate,
      totalOperations: this._totalOperations,
      readOperations: this._readOperations,
      writeOperations: this._writeOperations,
      deleteOperations: this._deleteOperations
    };
  }

  toPacket(): DataPacket<NoSQLDatabaseState> {
    const state: NoSQLDatabaseState = {
      type: this._type,
      stats: this.getStats(),
      lastQuery: this._lastQuery || undefined,
      lastResult: this._lastResult || undefined
    };
    this._counter++;
    return {
      id: `nosql-db-${Date.now()}-${this._counter}`,
      payload: state,
      metadata: {
        createdAt: Date.now(),
        route: ['database', 'nosql'],
        priority: 1,
        phase: 'data-storage'
      }
    };
  }

  reset(): void {
    this._keyValueStore.clear();
    this._documentCollections.clear();
    this._columnFamilies.clear();
    this._graphNodes.clear();
    this._graphEdges.clear();
    this._totalOperations = 0;
    this._readOperations = 0;
    this._writeOperations = 0;
    this._deleteOperations = 0;
    this._lastQuery = null;
    this._lastResult = null;
    this._counter = 0;
    this._hitCount = 0;
    this._missCount = 0;
    this._initializeCollections();
  }
}
