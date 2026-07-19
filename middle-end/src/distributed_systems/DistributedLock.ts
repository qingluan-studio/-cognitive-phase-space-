import { DataPacket } from '../shared/types';

export interface DistributedLockInfo {
  readonly name: string;
  readonly holder: string;
  readonly expires: number;
  readonly version: number;
}

export interface Lease {
  readonly id: string;
  readonly holder: string;
  readonly ttl: number;
  readonly createdAt: number;
  readonly renewable: boolean;
}

export class DistributedLock {
  private _locks: Map<string, DistributedLockInfo> = new Map();
  private _leases: Map<string, Lease> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get lockCount(): number {
    return this._locks.size;
  }

  get leaseCount(): number {
    return this._leases.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  public acquireLock(name: string, holder: string, timeout: number): { acquired: boolean; lock: string; holder: string; expires: number } {
    const existing = this._locks.get(name);
    const now = Date.now();
    if (existing && existing.expires > now) {
      this._recordHistory(`acquireLock(${name}) -> failed (held by ${existing.holder})`);
      return { acquired: false, lock: name, holder: existing.holder, expires: existing.expires };
    }
    const expires = now + timeout;
    this._locks.set(name, { name, holder, expires, version: (existing?.version ?? 0) + 1 });
    this._recordHistory(`acquireLock(${name}) -> success, holder=${holder}`);
    return { acquired: true, lock: name, holder, expires };
  }

  public releaseLock(name: string, holder: string): { released: boolean; lock: string; holder: string } {
    const lock = this._locks.get(name);
    const released = lock?.holder === holder;
    if (released) {
      this._locks.delete(name);
    }
    this._recordHistory(`releaseLock(${name}, ${holder}) -> ${released}`);
    return { released, lock: name, holder };
  }

  public tryLock(name: string, holder: string, waitTime: number): { acquired: boolean; waitTime: number; lock: string } {
    const acquired = Math.random() > 0.3;
    if (acquired) {
      this._locks.set(name, { name, holder, expires: Date.now() + 10000, version: 1 });
    }
    this._recordHistory(`tryLock(${name}, wait=${waitTime}ms) -> ${acquired}`);
    return { acquired, waitTime, lock: name };
  }

  public reentrantLock(name: string, holder: string, count: number): { acquired: boolean; count: number; lock: string } {
    this._locks.set(name, { name, holder, expires: Date.now() + 10000, version: count });
    this._recordHistory(`reentrantLock(${name}, count=${count})`);
    return { acquired: true, count, lock: name };
  }

  public lockLease(name: string, ttl: number, renew: boolean): { lease: Lease; renewed: boolean; ttl: number } {
    const existing = this._leases.get(name);
    const lease: Lease = {
      id: `lease-${name}`,
      holder: 'client-0',
      ttl,
      createdAt: existing?.createdAt ?? Date.now(),
      renewable: renew,
    };
    this._leases.set(name, lease);
    this._recordHistory(`lockLease(${name}, ttl=${ttl}, renew=${renew})`);
    return { lease, renewed: renew, ttl };
  }

  public zookeeperLock(path: string, client: string, type: 'ephemeral' | 'sequential'): { acquired: boolean; path: string; node: string } {
    const node = `${path}/lock-${Date.now()}`;
    const acquired = type === 'ephemeral' ? Math.random() > 0.3 : true;
    this._recordHistory(`zookeeperLock(path=${path}, type=${type}) -> ${acquired}`);
    return { acquired, path, node };
  }

  public redisLock(key: string, value: string, timeout: number): { acquired: boolean; key: string; value: string; expires: number } {
    const acquired = Math.random() > 0.2;
    const expires = Date.now() + timeout;
    if (acquired) {
      this._locks.set(key, { name: key, holder: value, expires, version: 1 });
    }
    this._recordHistory(`redisLock(key=${key}, timeout=${timeout}) -> ${acquired}`);
    return { acquired, key, value, expires };
  }

  public databaseLock(table: string, id: string, mode: 'shared' | 'exclusive'): { locked: boolean; table: string; id: string; mode: string } {
    const locked = Math.random() > 0.1;
    this._recordHistory(`databaseLock(${table}:${id}, mode=${mode}) -> ${locked}`);
    return { locked, table, id, mode };
  }

  public redlock(quorum: number, key: string, value: string, timeout: number): { acquired: boolean; quorum: number; nodes: number; key: string } {
    const nodes = quorum * 2 - 1;
    const acquired = Math.random() > 0.15;
    this._recordHistory(`redlock(quorum=${quorum}, nodes=${nodes}) -> ${acquired}`);
    return { acquired, quorum, nodes, key };
  }

  public fencingToken(lock: string, resource: string): { token: number; lock: string; resource: string; valid: boolean } {
    const token = this._counter;
    const valid = Math.random() > 0.1;
    this._recordHistory(`fencingToken(lock=${lock}, resource=${resource})`);
    return { token, lock, resource, valid };
  }

  public lockFree(dataStructure: string, operations: string[]): { operations: number; conflicts: number; succeeded: number } {
    const conflicts = Math.floor(operations.length * 0.1);
    const succeeded = operations.length - conflicts;
    this._recordHistory(`lockFree(${dataStructure}, ops=${operations.length}) -> conflicts=${conflicts}`);
    return { operations: operations.length, conflicts, succeeded };
  }

  public compareAndSwap(current: number, expected: number, newVal: number): { swapped: boolean; before: number; after: number } {
    const swapped = current === expected;
    this._recordHistory(`cas(current=${current}, expected=${expected}, new=${newVal}) -> ${swapped}`);
    return { swapped, before: current, after: swapped ? newVal : current };
  }

  public optimisticLocking(resource: string, version: number, update: (data: unknown) => unknown): { updated: boolean; version: number; resource: string } {
    const updated = Math.random() > 0.2;
    const newVersion = updated ? version + 1 : version;
    this._recordHistory(`optimisticLocking(resource=${resource}, version=${version}) -> ${updated}`);
    return { updated, version: newVersion, resource };
  }

  public mutex(mutexId: string, owner: string): { locked: boolean; mutex: string; owner: string } {
    const locked = Math.random() > 0.3;
    if (locked) {
      this._locks.set(mutexId, { name: mutexId, holder: owner, expires: Date.now() + 5000, version: 1 });
    }
    this._recordHistory(`mutex(${mutexId}, owner=${owner}) -> ${locked}`);
    return { locked, mutex: mutexId, owner };
  }

  public semaphore(name: string, permits: number, holders: string[]): { available: number; acquired: number; waiters: number } {
    const acquired = Math.min(permits, holders.length);
    const available = permits - acquired;
    const waiters = Math.max(0, holders.length - permits);
    this._recordHistory(`semaphore(${name}, permits=${permits}, holders=${holders.length})`);
    return { available, acquired, waiters };
  }

  public redisRedLock(
    lockKey: string,
    clientId: string,
    instances: string[],
    ttl: number
  ): {
    acquired: boolean;
    quorum: number;
    instances: number;
    lockKey: string;
    validityTime: number;
  } {
    const quorum = Math.floor(instances.length / 2) + 1;
    const successful = quorum + Math.floor(Math.random() * (instances.length - quorum + 1));
    const acquired = successful >= quorum;
    const validityTime = acquired ? ttl : 0;
    if (acquired) {
      this._locks.set(lockKey, { name: lockKey, holder: clientId, expires: Date.now() + ttl, version: 1 });
    }
    this._recordHistory(`redisRedLock(key=${lockKey}, instances=${instances.length}, quorum=${quorum}) -> ${acquired}`);
    return { acquired, quorum, instances: instances.length, lockKey, validityTime };
  }

  public zookeeperSequentialLock(
    path: string,
    clientId: string,
    waiters: string[]
  ): {
    acquired: boolean;
    myNode: string;
    position: number;
    watchNode: string | null;
    path: string;
  } {
    const myNode = `${path}/lock-${Date.now().toString().padStart(20, '0')}`;
    const allNodes = [...waiters, myNode].sort();
    const position = allNodes.indexOf(myNode);
    const acquired = position === 0;
    const watchNode = position > 0 ? allNodes[position - 1] ?? null : null;
    if (acquired) {
      this._locks.set(path, { name: path, holder: clientId, expires: Date.now() + 30000, version: 1 });
    }
    this._recordHistory(`zookeeperSequentialLock(path=${path}, waiters=${waiters.length}) -> acquired=${acquired}, pos=${position}`);
    return { acquired, myNode, position, watchNode, path };
  }

  public databaseAdvisoryLock(
    connectionId: string,
    lockId: number,
    mode: 'shared' | 'exclusive',
    timeout: number
  ): {
    acquired: boolean;
    lockId: number;
    connectionId: string;
    mode: string;
    duration: number;
  } {
    const acquired = Math.random() > 0.2;
    const duration = acquired ? Math.floor(timeout * 0.8) : 0;
    if (acquired) {
      this._locks.set(`db-${lockId}`, { name: `db-${lockId}`, holder: connectionId, expires: Date.now() + duration, version: 1 });
    }
    this._recordHistory(`databaseAdvisoryLock(lockId=${lockId}, mode=${mode}, timeout=${timeout}) -> ${acquired}`);
    return { acquired, lockId, connectionId, mode, duration };
  }

  public etcdLock(
    key: string,
    value: string,
    leaseId: string,
    ttl: number
  ): {
    acquired: boolean;
    key: string;
    leaseId: string;
    revision: number;
    ttl: number;
  } {
    const acquired = Math.random() > 0.15;
    const revision = this._counter;
    if (acquired) {
      this._locks.set(key, { name: key, holder: value, expires: Date.now() + ttl, version: revision });
      this._leases.set(key, { id: leaseId, holder: value, ttl, createdAt: Date.now(), renewable: true });
    }
    this._recordHistory(`etcdLock(key=${key}, lease=${leaseId}, ttl=${ttl}) -> ${acquired}`);
    return { acquired, key, leaseId, revision, ttl };
  }

  public consulLock(
    key: string,
    sessionId: string,
    behavior: 'release' | 'delete',
    ttl: string
  ): {
    acquired: boolean;
    key: string;
    sessionId: string;
    behavior: string;
    ttl: string;
  } {
    const acquired = Math.random() > 0.2;
    if (acquired) {
      this._locks.set(key, { name: key, holder: sessionId, expires: Date.now() + 15000, version: 1 });
    }
    this._recordHistory(`consulLock(key=${key}, session=${sessionId}, behavior=${behavior}) -> ${acquired}`);
    return { acquired, key, sessionId, behavior, ttl };
  }

  public leaseRenewal(
    leaseId: string,
    ttl: number
  ): {
    renewed: boolean;
    leaseId: string;
    newTtl: number;
    expiresAt: number;
  } {
    const lease = this._leases.get(leaseId);
    const renewed = !!lease && lease.renewable;
    const newTtl = renewed ? ttl : 0;
    const expiresAt = renewed ? Date.now() + ttl : 0;
    if (renewed && lease) {
      this._leases.set(leaseId, { ...lease, ttl: newTtl });
    }
    this._recordHistory(`leaseRenewal(lease=${leaseId}, ttl=${ttl}) -> ${renewed}`);
    return { renewed, leaseId, newTtl, expiresAt };
  }

  public lockContention(
    lockName: string,
    contenders: string[],
    maxWaitTime: number
  ): {
    lockName: string;
    contenders: number;
    averageWaitTime: number;
    maxWaitTime: number;
    winner: string;
  } {
    const winner = contenders[Math.floor(Math.random() * contenders.length)] ?? 'unknown';
    const averageWaitTime = Math.floor(maxWaitTime * 0.3 * (contenders.length / 10));
    this._recordHistory(`lockContention(lock=${lockName}, contenders=${contenders.length}) -> winner=${winner}`);
    return { lockName, contenders: contenders.length, averageWaitTime, maxWaitTime, winner };
  }

  public readWriteLock(
    resource: string,
    readers: string[],
    writer: string | null,
    operation: 'read' | 'write'
  ): {
    resource: string;
    readers: number;
    hasWriter: boolean;
    allowed: boolean;
    operation: string;
  } {
    let allowed = false;
    if (operation === 'read') {
      allowed = !writer || readers.length > 0;
    } else {
      allowed = readers.length === 0 && !writer;
    }
    if (operation === 'write' && allowed && writer) {
      this._locks.set(resource, { name: resource, holder: writer, expires: Date.now() + 5000, version: 1 });
    }
    this._recordHistory(`readWriteLock(resource=${resource}, readers=${readers.length}, op=${operation}) -> allowed=${allowed}`);
    return { resource, readers: readers.length, hasWriter: !!writer, allowed, operation };
  }

  public stripedLock(
    stripes: number,
    key: string,
    holder: string
  ): {
    stripes: number;
    stripeIndex: number;
    key: string;
    holder: string;
    acquired: boolean;
  } {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    const stripeIndex = Math.abs(hash) % stripes;
    const acquired = Math.random() > 0.3;
    if (acquired) {
      this._locks.set(`stripe-${stripeIndex}`, { name: `stripe-${stripeIndex}`, holder, expires: Date.now() + 5000, version: 1 });
    }
    this._recordHistory(`stripedLock(stripes=${stripes}, key=${key}, stripe=${stripeIndex}) -> ${acquired}`);
    return { stripes, stripeIndex, key, holder, acquired };
  }

  public spinLock(
    lockName: string,
    holder: string,
    maxRetries: number,
    backoffMs: number
  ): {
    lockName: string;
    holder: string;
    acquired: boolean;
    retries: number;
    totalWaitTime: number;
  } {
    let retries = 0;
    let acquired = false;
    let totalWaitTime = 0;
    for (let i = 0; i < maxRetries; i++) {
      retries = i + 1;
      if (Math.random() > 0.3) {
        acquired = true;
        break;
      }
      totalWaitTime += backoffMs * Math.pow(2, i);
    }
    if (acquired) {
      this._locks.set(lockName, { name: lockName, holder, expires: Date.now() + 3000, version: 1 });
    }
    this._recordHistory(`spinLock(${lockName}, retries=${retries}, wait=${totalWaitTime}ms) -> ${acquired}`);
    return { lockName, holder, acquired, retries, totalWaitTime };
  }

  public ticketLock(
    lockName: string,
    threads: string[]
  ): {
    lockName: string;
    nextTicket: number;
    nowServing: number;
    threads: number;
    fairness: number;
  } {
    const nextTicket = threads.length;
    const nowServing = Math.floor(threads.length * 0.3);
    const fairness = 0.95 + Math.random() * 0.05;
    this._recordHistory(`ticketLock(${lockName}, threads=${threads.length}, next=${nextTicket}, serving=${nowServing})`);
    return { lockName, nextTicket, nowServing, threads: threads.length, fairness };
  }

  public mcsLock(
    lockName: string,
    nodes: { id: string; next: string | null }[]
  ): {
    lockName: string;
    queueLength: number;
    tail: string | null;
    head: string | null;
    acquired: boolean;
  } {
    const queueLength = nodes.length;
    const tail = nodes.length > 0 ? nodes[nodes.length - 1]?.id ?? null : null;
    const head = nodes.length > 0 ? nodes[0]?.id ?? null : null;
    const acquired = nodes.length === 1;
    this._recordHistory(`mcsLock(${lockName}, queue=${queueLength}) -> acquired=${acquired}`);
    return { lockName, queueLength, tail, head, acquired };
  }

  public toPacket(): DataPacket<{
    locks: number;
    leases: number;
    history: string[];
  }> {
    return {
      id: `dist-lock-${Date.now()}-${this._counter}`,
      payload: {
        locks: this._locks.size,
        leases: this._leases.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'lock', 'result'],
        priority: 0.85,
        phase: 'exclusion',
      },
    };
  }

  public reset(): void {
    this._locks.clear();
    this._leases.clear();
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
