import { DataPacket } from '../shared/types';

export type IsolationLevel = 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
export type TransactionStatus = 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK' | 'ABORTED' | 'PREPARING' | 'PREPARED';
export type LockType = 'SHARED' | 'EXCLUSIVE' | 'INTENT_SHARED' | 'INTENT_EXCLUSIVE';
export type LockMode = 'PESSIMISTIC' | 'OPTIMISTIC';

export interface Transaction {
  id: string;
  status: TransactionStatus;
  isolationLevel: IsolationLevel;
  startTime: number;
  endTime?: number;
  operations: TransactionOperation[];
  lockSet: Set<string>;
  savepoints: Map<string, number>;
  readSet: Set<string>;
  writeSet: Map<string, unknown>;
  error?: string;
  retryCount: number;
}

export interface TransactionOperation {
  id: string;
  type: 'READ' | 'WRITE' | 'DELETE' | 'INSERT' | 'UPDATE';
  resource: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  timestamp: number;
  sequence: number;
}

export interface LockEntry {
  resource: string;
  type: LockType;
  transactionId: string;
  acquiredAt: number;
  mode: LockMode;
  version?: number;
}

export interface WALEntry {
  lsn: number;
  transactionId: string;
  operation: 'BEGIN' | 'COMMIT' | 'ROLLBACK' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CHECKPOINT';
  tableName?: string;
  primaryKey?: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: number;
  prevLSN?: number;
}

export interface MVCCVersion {
  version: number;
  value: unknown;
  transactionId: string;
  beginTimestamp: number;
  endTimestamp?: number;
  isDeleted: boolean;
}

export interface DeadlockInfo {
  detectedAt: number;
  transactions: string[];
  victim?: string;
  waitGraph: Map<string, string[]>;
}

export interface TransactionStatistics {
  totalTransactions: number;
  committed: number;
  rolledBack: number;
  aborted: number;
  active: number;
  averageDuration: number;
  totalLocks: number;
  deadlocksDetected: number;
  walEntries: number;
  mvccVersions: number;
}

export interface TransactionManagerState {
  statistics: TransactionStatistics;
  activeTransactions: Map<string, Transaction>;
  lockTable: Map<string, LockEntry[]>;
  lastTransaction?: Transaction;
  lastDeadlock?: DeadlockInfo;
}

export class TransactionManager {
  private _transactions: Map<string, Transaction> = new Map();
  private _lockTable: Map<string, LockEntry[]> = new Map();
  private _waitQueue: Map<string, string[]> = new Map();
  private _wal: WALEntry[] = [];
  private _mvccStore: Map<string, MVCCVersion[]> = new Map();
  private _nextLSN: number = 1;
  private _counter: number = 0;
  private _totalTransactions: number = 0;
  private _committed: number = 0;
  private _rolledBack: number = 0;
  private _aborted: number = 0;
  private _totalDuration: number = 0;
  private _deadlocksDetected: number = 0;
  private _lastDeadlock: DeadlockInfo | null = null;
  private _lastTransaction: Transaction | null = null;
  private _defaultIsolationLevel: IsolationLevel = 'REPEATABLE_READ';
  private _lockTimeout: number = 5000;
  private _maxRetries: number = 3;
  private _checkpointLSN: number = 0;

  constructor() {
    this._initializeDefaultData();
  }

  private _initializeDefaultData(): void {
    const initialKeys = ['user:1', 'user:2', 'user:3', 'product:1', 'product:2', 'order:1'];
    for (const key of initialKeys) {
      this._mvccStore.set(key, [
        {
          version: 1,
          value: { id: key, data: `initial data for ${key}` },
          transactionId: 'init',
          beginTimestamp: Date.now() - 86400000,
          isDeleted: false
        }
      ]);
    }
  }

  get activeTransactionCount(): number {
    let count = 0;
    for (const tx of this._transactions.values()) {
      if (tx.status === 'ACTIVE') count++;
    }
    return count;
  }

  get totalTransactions(): number {
    return this._totalTransactions;
  }

  get committedCount(): number {
    return this._committed;
  }

  get rolledBackCount(): number {
    return this._rolledBack;
  }

  get abortedCount(): number {
    return this._aborted;
  }

  get averageDuration(): number {
    return this._totalTransactions > 0 ? this._totalDuration / this._totalTransactions : 0;
  }

  get deadlocksDetected(): number {
    return this._deadlocksDetected;
  }

  get walEntryCount(): number {
    return this._wal.length;
  }

  get mvccVersionCount(): number {
    let count = 0;
    for (const versions of this._mvccStore.values()) {
      count += versions.length;
    }
    return count;
  }

  get lastTransaction(): Transaction | null {
    return this._lastTransaction;
  }

  get lastDeadlock(): DeadlockInfo | null {
    return this._lastDeadlock;
  }

  get statistics(): TransactionStatistics {
    return {
      totalTransactions: this._totalTransactions,
      committed: this._committed,
      rolledBack: this._rolledBack,
      aborted: this._aborted,
      active: this.activeTransactionCount,
      averageDuration: this.averageDuration,
      totalLocks: this._getTotalLocks(),
      deadlocksDetected: this._deadlocksDetected,
      walEntries: this._wal.length,
      mvccVersions: this.mvccVersionCount
    };
  }

  private _getTotalLocks(): number {
    let count = 0;
    for (const locks of this._lockTable.values()) {
      count += locks.length;
    }
    return count;
  }

  begin(isolationLevel: IsolationLevel = this._defaultIsolationLevel): Transaction {
    const id = `tx-${Date.now()}-${++this._counter}`;
    const tx: Transaction = {
      id,
      status: 'ACTIVE',
      isolationLevel,
      startTime: Date.now(),
      operations: [],
      lockSet: new Set(),
      savepoints: new Map(),
      readSet: new Set(),
      writeSet: new Map(),
      retryCount: 0
    };
    this._transactions.set(id, tx);
    this._totalTransactions++;
    this._writeWAL(id, 'BEGIN');
    return tx;
  }

  commit(transactionId: string): boolean {
    const tx = this._transactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') return false;

    if (this._detectDeadlock(transactionId)) {
      this._handleDeadlock(transactionId);
      return false;
    }

    for (const [key, value] of tx.writeSet) {
      this._applyWrite(tx, key, value);
    }

    tx.status = 'COMMITTED';
    tx.endTime = Date.now();
    this._committed++;
    this._totalDuration += tx.endTime - tx.startTime;
    this._writeWAL(transactionId, 'COMMIT');
    this._releaseLocks(transactionId);
    this._lastTransaction = tx;

    return true;
  }

  rollback(transactionId: string): boolean {
    const tx = this._transactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') return false;

    tx.writeSet.clear();
    tx.status = 'ROLLED_BACK';
    tx.endTime = Date.now();
    this._rolledBack++;
    this._totalDuration += tx.endTime - tx.startTime;
    this._writeWAL(transactionId, 'ROLLBACK');
    this._releaseLocks(transactionId);
    this._lastTransaction = tx;

    return true;
  }

  read(transactionId: string, key: string): unknown | null {
    const tx = this._transactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') return null;

    if (tx.writeSet.has(key)) {
      return tx.writeSet.get(key);
    }

    tx.readSet.add(key);

    if (tx.isolationLevel === 'READ_UNCOMMITTED') {
      const latest = this._getLatestVersion(key);
      return latest ? latest.value : null;
    }

    const visibleVersion = this._getVisibleVersion(key, tx);
    return visibleVersion ? visibleVersion.value : null;
  }

  write(transactionId: string, key: string, value: unknown): boolean {
    const tx = this._transactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') return false;

    if (!this._acquireLock(tx, key, 'EXCLUSIVE')) {
      return false;
    }

    const existing = tx.writeSet.get(key);
    tx.writeSet.set(key, value);
    tx.operations.push({
      id: `op-${tx.operations.length + 1}`,
      type: existing ? 'UPDATE' : 'INSERT',
      resource: key,
      beforeValue: existing,
      afterValue: value,
      timestamp: Date.now(),
      sequence: tx.operations.length + 1
    });
    this._writeWAL(transactionId, 'UPDATE', key, existing, value);

    return true;
  }

  delete(transactionId: string, key: string): boolean {
    const tx = this._transactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') return false;

    if (!this._acquireLock(tx, key, 'EXCLUSIVE')) {
      return false;
    }

    const existing = tx.writeSet.get(key);
    tx.writeSet.set(key, null);
    tx.operations.push({
      id: `op-${tx.operations.length + 1}`,
      type: 'DELETE',
      resource: key,
      beforeValue: existing,
      afterValue: null,
      timestamp: Date.now(),
      sequence: tx.operations.length + 1
    });
    this._writeWAL(transactionId, 'DELETE', key, existing, null);

    return true;
  }

  private _acquireLock(tx: Transaction, resource: string, type: LockType): boolean {
    const lockKey = `${type}:${resource}`;
    if (tx.lockSet.has(lockKey)) return true;

    const existingLocks = this._lockTable.get(resource) || [];
    const hasConflict = existingLocks.some(lock => {
      if (lock.transactionId === tx.id) return false;
      if (type === 'SHARED' && lock.type === 'SHARED') return false;
      return true;
    });

    if (hasConflict) {
      const waiters = this._waitQueue.get(resource) || [];
      waiters.push(tx.id);
      this._waitQueue.set(resource, waiters);

      const startTime = Date.now();
      while (Date.now() - startTime < this._lockTimeout) {
        const currentLocks = this._lockTable.get(resource) || [];
        const stillConflicting = currentLocks.some(lock => {
          if (lock.transactionId === tx.id) return false;
          if (type === 'SHARED' && lock.type === 'SHARED') return false;
          return true;
        });
        if (!stillConflicting) break;
      }

      const afterWaitLocks = this._lockTable.get(resource) || [];
      const stillConflict = afterWaitLocks.some(lock => {
        if (lock.transactionId === tx.id) return false;
        if (type === 'SHARED' && lock.type === 'SHARED') return false;
        return true;
      });

      if (stillConflict) {
        const queue = this._waitQueue.get(resource) || [];
        const idx = queue.indexOf(tx.id);
        if (idx > -1) queue.splice(idx, 1);
        this._waitQueue.set(resource, queue);
        return false;
      }
    }

    const entry: LockEntry = {
      resource,
      type,
      transactionId: tx.id,
      acquiredAt: Date.now(),
      mode: 'PESSIMISTIC'
    };
    if (!this._lockTable.has(resource)) {
      this._lockTable.set(resource, []);
    }
    this._lockTable.get(resource)!.push(entry);
    tx.lockSet.add(lockKey);

    return true;
  }

  private _releaseLocks(transactionId: string): void {
    const tx = this._transactions.get(transactionId);
    if (!tx) return;

    for (const lockKey of tx.lockSet) {
      const parts = lockKey.split(':');
      const resource = parts.slice(1).join(':');
      const locks = this._lockTable.get(resource);
      if (locks) {
        const filtered = locks.filter(l => l.transactionId !== transactionId);
        if (filtered.length === 0) {
          this._lockTable.delete(resource);
        } else {
          this._lockTable.set(resource, filtered);
        }
      }

      const waiters = this._waitQueue.get(resource);
      if (waiters && waiters.length > 0) {
        this._waitQueue.delete(resource);
      }
    }

    tx.lockSet.clear();
  }

  private _applyWrite(tx: Transaction, key: string, value: unknown): void {
    const versions = this._mvccStore.get(key) || [];
    const newVersion: MVCCVersion = {
      version: versions.length + 1,
      value,
      transactionId: tx.id,
      beginTimestamp: tx.endTime || Date.now(),
      isDeleted: value === null
    };

    if (versions.length > 0) {
      versions[versions.length - 1].endTimestamp = tx.endTime || Date.now();
    }
    versions.push(newVersion);
    this._mvccStore.set(key, versions);
  }

  private _getLatestVersion(key: string): MVCCVersion | null {
    const versions = this._mvccStore.get(key);
    if (!versions || versions.length === 0) return null;
    return versions[versions.length - 1];
  }

  private _getVisibleVersion(key: string, tx: Transaction): MVCCVersion | null {
    const versions = this._mvccStore.get(key);
    if (!versions || versions.length === 0) return null;

    for (let i = versions.length - 1; i >= 0; i--) {
      const v = versions[i];
      if (v.transactionId === tx.id) return v;
      if (v.beginTimestamp <= tx.startTime && (!v.endTimestamp || v.endTimestamp > tx.startTime)) {
        if (!v.isDeleted) return v;
        return null;
      }
    }
    return null;
  }

  private _writeWAL(
    transactionId: string,
    operation: WALEntry['operation'],
    primaryKey?: string,
    oldValue?: unknown,
    newValue?: unknown
  ): void {
    const entry: WALEntry = {
      lsn: this._nextLSN++,
      transactionId,
      operation,
      primaryKey,
      oldValue,
      newValue,
      timestamp: Date.now(),
      prevLSN: this._wal.length > 0 ? this._wal[this._wal.length - 1].lsn : undefined
    };
    this._wal.push(entry);
  }

  savepoint(transactionId: string, name: string): boolean {
    const tx = this._transactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') return false;
    tx.savepoints.set(name, tx.operations.length);
    return true;
  }

  rollbackToSavepoint(transactionId: string, name: string): boolean {
    const tx = this._transactions.get(transactionId);
    if (!tx || tx.status !== 'ACTIVE') return false;
    const savepointOpIndex = tx.savepoints.get(name);
    if (savepointOpIndex === undefined) return false;

    const toRollback = tx.operations.slice(savepointOpIndex);
    for (let i = toRollback.length - 1; i >= 0; i--) {
      const op = toRollback[i];
      if (op.beforeValue !== undefined) {
        tx.writeSet.set(op.resource, op.beforeValue);
      } else {
        tx.writeSet.delete(op.resource);
      }
    }
    tx.operations = tx.operations.slice(0, savepointOpIndex);
    return true;
  }

  private _detectDeadlock(transactionId: string): boolean {
    const waitForGraph = this._buildWaitForGraph();
    const visited = new Set<string>();
    const inStack = new Set<string>();
    return this._hasCycle(transactionId, waitForGraph, visited, inStack);
  }

  private _buildWaitForGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    for (const [resource, locks] of this._lockTable) {
      const holders = locks.map(l => l.transactionId);
      const waiters = this._waitQueue.get(resource) || [];
      for (const waiter of waiters) {
        if (!graph.has(waiter)) {
          graph.set(waiter, []);
        }
        for (const holder of holders) {
          if (holder !== waiter && !graph.get(waiter)!.includes(holder)) {
            graph.get(waiter)!.push(holder);
          }
        }
      }
    }
    return graph;
  }

  private _hasCycle(node: string, graph: Map<string, string[]>, visited: Set<string>, inStack: Set<string>): boolean {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    inStack.add(node);
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (this._hasCycle(neighbor, graph, visited, inStack)) {
        return true;
      }
    }
    inStack.delete(node);
    return false;
  }

  private _handleDeadlock(transactionId: string): void {
    const tx = this._transactions.get(transactionId);
    if (!tx) return;

    this._deadlocksDetected++;
    const waitGraph = this._buildWaitForGraph();
    const deadlockInfo: DeadlockInfo = {
      detectedAt: Date.now(),
      transactions: Array.from(waitGraph.keys()),
      victim: transactionId,
      waitGraph
    };
    this._lastDeadlock = deadlockInfo;

    if (tx.retryCount < this._maxRetries) {
      tx.retryCount++;
      this.rollback(transactionId);
    } else {
      tx.status = 'ABORTED';
      tx.error = 'Deadlock detected, max retries exceeded';
      tx.endTime = Date.now();
      this._aborted++;
      this._releaseLocks(transactionId);
    }
  }

  checkpoint(): number {
    const lsn = this._nextLSN - 1;
    this._writeWAL('checkpoint', 'CHECKPOINT');
    this._checkpointLSN = lsn;

    const cutoff = lsn - 1000;
    this._wal = this._wal.filter(e => e.lsn >= cutoff);

    return lsn;
  }

  getTransaction(transactionId: string): Transaction | undefined {
    return this._transactions.get(transactionId);
  }

  getActiveTransactions(): Transaction[] {
    const active: Transaction[] = [];
    for (const tx of this._transactions.values()) {
      if (tx.status === 'ACTIVE') active.push(tx);
    }
    return active;
  }

  getLocksForTransaction(transactionId: string): LockEntry[] {
    const result: LockEntry[] = [];
    for (const locks of this._lockTable.values()) {
      for (const lock of locks) {
        if (lock.transactionId === transactionId) {
          result.push(lock);
        }
      }
    }
    return result;
  }

  getMVCCVersions(key: string): MVCCVersion[] {
    return this._mvccStore.get(key) || [];
  }

  getWALEntries(fromLSN?: number, limit: number = 100): WALEntry[] {
    if (fromLSN === undefined) return this._wal.slice(-limit);
    const idx = this._wal.findIndex(e => e.lsn >= fromLSN);
    if (idx === -1) return [];
    return this._wal.slice(idx, idx + limit);
  }

  setDefaultIsolationLevel(level: IsolationLevel): void {
    this._defaultIsolationLevel = level;
  }

  setLockTimeout(ms: number): void {
    this._lockTimeout = ms;
  }

  setMaxRetries(retries: number): void {
    this._maxRetries = retries;
  }

  getLockStats(): {
    totalLocks: number;
    exclusiveLocks: number;
    sharedLocks: number;
    contendedResources: number;
  } {
    let exclusive = 0;
    let shared = 0;
    let contended = 0;
    for (const [resource, locks] of this._lockTable) {
      for (const lock of locks) {
        if (lock.type === 'EXCLUSIVE') exclusive++;
        else if (lock.type === 'SHARED') shared++;
      }
      const waiters = this._waitQueue.get(resource);
      if (waiters && waiters.length > 0) contended++;
    }
    return {
      totalLocks: this._getTotalLocks(),
      exclusiveLocks: exclusive,
      sharedLocks: shared,
      contendedResources: contended
    };
  }

  toPacket(): DataPacket<TransactionManagerState> {
    const active = new Map<string, Transaction>();
    for (const [id, tx] of this._transactions) {
      if (tx.status === 'ACTIVE') active.set(id, tx);
    }
    const state: TransactionManagerState = {
      statistics: this.statistics,
      activeTransactions: active,
      lockTable: this._lockTable,
      lastTransaction: this._lastTransaction || undefined,
      lastDeadlock: this._lastDeadlock || undefined
    };
    this._counter++;
    return {
      id: `tx-manager-${Date.now()}-${this._counter}`,
      payload: state,
      metadata: {
        createdAt: Date.now(),
        route: ['database', 'transaction-manager'],
        priority: 1,
        phase: 'transaction-management'
      }
    };
  }

  reset(): void {
    this._transactions.clear();
    this._lockTable.clear();
    this._waitQueue.clear();
    this._wal = [];
    this._mvccStore.clear();
    this._nextLSN = 1;
    this._counter = 0;
    this._totalTransactions = 0;
    this._committed = 0;
    this._rolledBack = 0;
    this._aborted = 0;
    this._totalDuration = 0;
    this._deadlocksDetected = 0;
    this._lastDeadlock = null;
    this._lastTransaction = null;
    this._checkpointLSN = 0;
    this._initializeDefaultData();
  }
}
