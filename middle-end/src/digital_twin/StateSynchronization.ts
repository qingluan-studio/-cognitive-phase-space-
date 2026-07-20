import { DataPacket } from '../shared/types';

export interface TwinState {
  id: string;
  timestamp: number;
  values: Map<string, number | string | boolean | number[]>;
  quality: number;
  source: string;
  version: number;
  checksum: string;
}

export interface RealTimeSyncConfig {
  id: string;
  name: string;
  updateRate: number;
  bufferSize: number;
  retryAttempts: number;
  timeout: number;
  priority: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  qosLevel: number;
  metadata: Record<string, unknown>;
}

export interface LatencyCompensation {
  enabled: boolean;
  estimatedLatency: number;
  compensationMethod: 'extrapolation' | 'interpolation' | 'buffering' | 'prediction';
  bufferDepth: number;
  maxCompensatedLatency: number;
  confidenceThreshold: number;
}

export interface StatePredictor {
  id: string;
  modelType: 'linear' | 'kalman' | 'arima' | 'lstm' | 'ensemble';
  horizon: number;
  confidenceInterval: number;
  updateInterval: number;
  features: string[];
  weights: number[];
  lastTrainingTime: number;
  accuracy: number;
}

export interface CorrectionMechanism {
  id: string;
  trigger: 'threshold' | 'manual' | 'periodic' | 'anomaly';
  threshold: number;
  maxCorrection: number;
  smoothingFactor: number;
  historyWindow: number;
  enabled: boolean;
}

export interface SyncEvent {
  id: string;
  timestamp: number;
  type: 'state-update' | 'sync-start' | 'sync-complete' | 'sync-error' | 'correction' | 'prediction';
  sourceId: string;
  targetId: string;
  data: Record<string, unknown>;
  latency: number;
  success: boolean;
}

export interface StateHistory {
  stateId: string;
  entries: TwinState[];
  maxSize: number;
  retentionPolicy: 'count' | 'time' | 'both';
  retentionValue: number;
}

export interface SyncHealth {
  sourceId: string;
  lastSyncTime: number;
  averageLatency: number;
  syncSuccessRate: number;
  driftRate: number;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
}

export interface TimeSyncConfig {
  protocol: 'ntp' | 'ptp' | 'gps' | 'manual';
  pollingInterval: number;
  accuracyThreshold: number;
  timezone: string;
  daylightSaving: boolean;
}

export class StateSynchronization {
  private _currentState: TwinState | null = null;
  private _stateHistory: Map<string, StateHistory> = new Map();
  private _syncConfigs: Map<string, RealTimeSyncConfig> = new Map();
  private _latencyCompensation: LatencyCompensation = {
    enabled: true,
    estimatedLatency: 0,
    compensationMethod: 'extrapolation',
    bufferDepth: 10,
    maxCompensatedLatency: 500,
    confidenceThreshold: 0.8
  };
  private _predictors: Map<string, StatePredictor> = new Map();
  private _correctionMechanisms: Map<string, CorrectionMechanism> = new Map();
  private _syncEvents: SyncEvent[] = [];
  private _lastSyncTime: number = 0;
  private _counter: number = 0;
  private _syncInterval: number = 1000;
  private _isRunning: boolean = false;
  private _buffer: TwinState[] = [];
  private _maxBufferSize: number = 1000;
  private _timeSyncConfig: TimeSyncConfig = {
    protocol: 'ntp',
    pollingInterval: 64,
    accuracyThreshold: 10,
    timezone: 'UTC',
    daylightSaving: false
  };
  private _healthMetrics: Map<string, SyncHealth> = new Map();
  private _stateSubscriptions: Map<string, ((state: TwinState) => void)[]> = new Map();
  private _syncLock: Map<string, boolean> = new Map();
  private _driftCompensation: Map<string, number> = new Map();
  private _batchSize: number = 50;
  private _conflictResolution: 'latest' | 'priority' | 'merge' | 'manual' = 'latest';
  private _auditTrail: { timestamp: number; action: string; details: string }[] = [];

  constructor() {
    this._initDefaultPredictors();
    this._initDefaultCorrectionMechanisms();
  }

  private _initDefaultPredictors(): void {
    this._predictors.set('default-linear', {
      id: 'default-linear',
      modelType: 'linear',
      horizon: 10,
      confidenceInterval: 0.95,
      updateInterval: 1000,
      features: ['value', 'velocity', 'acceleration'],
      weights: [0.5, 0.3, 0.2],
      lastTrainingTime: Date.now(),
      accuracy: 0.85
    });

    this._predictors.set('default-kalman', {
      id: 'default-kalman',
      modelType: 'kalman',
      horizon: 5,
      confidenceInterval: 0.99,
      updateInterval: 500,
      features: ['position', 'velocity'],
      weights: [0.7, 0.3],
      lastTrainingTime: Date.now(),
      accuracy: 0.92
    });
  }

  private _initDefaultCorrectionMechanisms(): void {
    this._correctionMechanisms.set('threshold-correction', {
      id: 'threshold-correction',
      trigger: 'threshold',
      threshold: 0.1,
      maxCorrection: 1.0,
      smoothingFactor: 0.5,
      historyWindow: 10,
      enabled: true
    });

    this._correctionMechanisms.set('periodic-correction', {
      id: 'periodic-correction',
      trigger: 'periodic',
      threshold: 0.05,
      maxCorrection: 0.5,
      smoothingFactor: 0.3,
      historyWindow: 20,
      enabled: true
    });
  }

  get currentState(): TwinState | null {
    return this._currentState;
  }

  get stateHistory(): Map<string, StateHistory> {
    return new Map(this._stateHistory);
  }

  get syncConfigs(): Map<string, RealTimeSyncConfig> {
    return new Map(this._syncConfigs);
  }

  get latencyCompensation(): LatencyCompensation {
    return { ...this._latencyCompensation };
  }

  get predictors(): Map<string, StatePredictor> {
    return new Map(this._predictors);
  }

  get correctionMechanisms(): Map<string, CorrectionMechanism> {
    return new Map(this._correctionMechanisms);
  }

  get syncEvents(): SyncEvent[] {
    return [...this._syncEvents];
  }

  get lastSyncTime(): number {
    return this._lastSyncTime;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get bufferSize(): number {
    return this._buffer.length;
  }

  get healthMetrics(): Map<string, SyncHealth> {
    return new Map(this._healthMetrics);
  }

  get timeSyncConfig(): TimeSyncConfig {
    return { ...this._timeSyncConfig };
  }

  get syncInterval(): number {
    return this._syncInterval;
  }

  get batchSize(): number {
    return this._batchSize;
  }

  get conflictResolution(): string {
    return this._conflictResolution;
  }

  setSyncInterval(interval: number): void {
    this._syncInterval = interval;
  }

  setBatchSize(size: number): void {
    this._batchSize = size;
  }

  setConflictResolution(strategy: 'latest' | 'priority' | 'merge' | 'manual'): void {
    this._conflictResolution = strategy;
  }

  setLatencyCompensation(config: Partial<LatencyCompensation>): void {
    this._latencyCompensation = { ...this._latencyCompensation, ...config };
  }

  setTimeSyncConfig(config: Partial<TimeSyncConfig>): void {
    this._timeSyncConfig = { ...this._timeSyncConfig, ...config };
  }

  addSyncConfig(config: RealTimeSyncConfig): void {
    this._syncConfigs.set(config.id, config);
  }

  removeSyncConfig(id: string): boolean {
    return this._syncConfigs.delete(id);
  }

  updateSyncConfig(id: string, updates: Partial<RealTimeSyncConfig>): boolean {
    const config = this._syncConfigs.get(id);
    if (!config) return false;
    this._syncConfigs.set(id, { ...config, ...updates, id });
    return true;
  }

  addPredictor(predictor: StatePredictor): void {
    this._predictors.set(predictor.id, predictor);
  }

  removePredictor(id: string): boolean {
    return this._predictors.delete(id);
  }

  addCorrectionMechanism(mechanism: CorrectionMechanism): void {
    this._correctionMechanisms.set(mechanism.id, mechanism);
  }

  removeCorrectionMechanism(id: string): boolean {
    return this._correctionMechanisms.delete(id);
  }

  updateState(state: TwinState): void {
    this._currentState = state;
    this._buffer.push(state);

    if (this._buffer.length > this._maxBufferSize) {
      this._buffer.shift();
    }

    this._addToHistory(state);
    this._lastSyncTime = Date.now();
    this._counter++;

    this._notifySubscribers(state);
    this._recordSyncEvent({
      id: `sync-${Date.now()}`,
      timestamp: Date.now(),
      type: 'state-update',
      sourceId: state.source,
      targetId: 'twin-core',
      data: { stateId: state.id, quality: state.quality },
      latency: 0,
      success: true
    });

    this._audit('update-state', `Updated state ${state.id} from source ${state.source}`);
  }

  private _addToHistory(state: TwinState): void {
    const history = this._stateHistory.get(state.id) || {
      stateId: state.id,
      entries: [],
      maxSize: 10000,
      retentionPolicy: 'count' as const,
      retentionValue: 10000
    };

    history.entries.push(state);

    if (history.retentionPolicy === 'count' && history.entries.length > history.maxSize) {
      history.entries.shift();
    } else if (history.retentionPolicy === 'time') {
      const cutoff = Date.now() - history.retentionValue;
      history.entries = history.entries.filter(e => e.timestamp > cutoff);
    }

    this._stateHistory.set(state.id, history);
  }

  getStateHistory(stateId: string, limit?: number): TwinState[] {
    const history = this._stateHistory.get(stateId);
    if (!history) return [];
    if (limit) return history.entries.slice(-limit);
    return [...history.entries];
  }

  getStateAtTime(stateId: string, timestamp: number): TwinState | undefined {
    const history = this._stateHistory.get(stateId);
    if (!history) return undefined;
    return history.entries.find(e => e.timestamp >= timestamp);
  }

  interpolateState(stateId: string, timestamp: number): TwinState | null {
    const history = this._stateHistory.get(stateId);
    if (!history || history.entries.length < 2) return null;

    const sorted = [...history.entries].sort((a, b) => a.timestamp - b.timestamp);
    let before = sorted[0];
    let after = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].timestamp <= timestamp && sorted[i + 1].timestamp >= timestamp) {
        before = sorted[i];
        after = sorted[i + 1];
        break;
      }
    }

    const t = (timestamp - before.timestamp) / (after.timestamp - before.timestamp);
    const interpolatedValues = new Map<string, number | string | boolean | number[]>();

    for (const [key, beforeVal] of before.values) {
      const afterVal = after.values.get(key);
      if (typeof beforeVal === 'number' && typeof afterVal === 'number') {
        interpolatedValues.set(key, beforeVal + t * (afterVal - beforeVal));
      } else {
        interpolatedValues.set(key, t > 0.5 ? afterVal : beforeVal);
      }
    }

    return {
      id: stateId,
      timestamp,
      values: interpolatedValues,
      quality: Math.min(before.quality, after.quality),
      source: 'interpolation',
      version: Math.max(before.version, after.version),
      checksum: `${stateId}-${timestamp}`
    };
  }

  predictState(stateId: string, predictorId: string, steps: number): TwinState | null {
    const predictor = this._predictors.get(predictorId);
    const history = this._stateHistory.get(stateId);
    if (!predictor || !history || history.entries.length < 2) return null;

    const recent = history.entries.slice(-predictor.horizon);
    const lastState = recent[recent.length - 1];
    const predictedValues = new Map<string, number | string | boolean | number[]>();

    for (const [key, val] of lastState.values) {
      if (typeof val === 'number') {
        const trend = recent.length > 1
          ? (recent[recent.length - 1].values.get(key) as number - recent[0].values.get(key) as number) / recent.length
          : 0;
        predictedValues.set(key, val + trend * steps);
      } else {
        predictedValues.set(key, val);
      }
    }

    return {
      id: stateId,
      timestamp: Date.now() + steps * predictor.updateInterval,
      values: predictedValues,
      quality: lastState.quality * predictor.accuracy,
      source: `predictor-${predictorId}`,
      version: lastState.version + 1,
      checksum: `${stateId}-predicted-${Date.now()}`
    };
  }

  applyCorrection(stateId: string, mechanismId: string, targetValue: number): boolean {
    const mechanism = this._correctionMechanisms.get(mechanismId);
    if (!mechanism || !mechanism.enabled) return false;

    const history = this._stateHistory.get(stateId);
    if (!history || history.entries.length === 0) return false;

    const lastState = history.entries[history.entries.length - 1];
    const currentValue = lastState.values.get('value') as number;
    const error = targetValue - currentValue;

    if (Math.abs(error) < mechanism.threshold) return false;

    const correction = Math.max(-mechanism.maxCorrection, Math.min(mechanism.maxCorrection, error * mechanism.smoothingFactor));
    const correctedValue = currentValue + correction;

    lastState.values.set('value', correctedValue);
    lastState.values.set('correctionApplied', correction);
    lastState.timestamp = Date.now();
    lastState.version++;

    this._recordSyncEvent({
      id: `correction-${Date.now()}`,
      timestamp: Date.now(),
      type: 'correction',
      sourceId: mechanismId,
      targetId: stateId,
      data: { correction, targetValue, correctedValue },
      latency: 0,
      success: true
    });

    this._audit('apply-correction', `Applied correction ${correction} to state ${stateId}`);
    return true;
  }

  startSync(): void {
    this._isRunning = true;
    this._recordSyncEvent({
      id: `sync-start-${Date.now()}`,
      timestamp: Date.now(),
      type: 'sync-start',
      sourceId: 'system',
      targetId: 'all',
      data: { interval: this._syncInterval },
      latency: 0,
      success: true
    });
    this._audit('start-sync', 'State synchronization started');
  }

  stopSync(): void {
    this._isRunning = false;
    this._recordSyncEvent({
      id: `sync-stop-${Date.now()}`,
      timestamp: Date.now(),
      type: 'sync-complete',
      sourceId: 'system',
      targetId: 'all',
      data: {},
      latency: 0,
      success: true
    });
    this._audit('stop-sync', 'State synchronization stopped');
  }

  syncBatch(states: TwinState[]): { processed: number; failed: number; latencies: number[] } {
    let processed = 0;
    let failed = 0;
    const latencies: number[] = [];

    for (const state of states) {
      const startTime = Date.now();
      try {
        this.updateState(state);
        processed++;
        latencies.push(Date.now() - startTime);
      } catch {
        failed++;
        this._recordSyncEvent({
          id: `sync-error-${Date.now()}`,
          timestamp: Date.now(),
          type: 'sync-error',
          sourceId: state.source,
          targetId: 'twin-core',
          data: { stateId: state.id },
          latency: Date.now() - startTime,
          success: false
        });
      }
    }

    return { processed, failed, latencies };
  }

  private _recordSyncEvent(event: SyncEvent): void {
    this._syncEvents.push(event);
    if (this._syncEvents.length > 10000) {
      this._syncEvents.shift();
    }
  }

  private _notifySubscribers(state: TwinState): void {
    const listeners = this._stateSubscriptions.get(state.id) || [];
    for (const listener of listeners) {
      listener(state);
    }
  }

  subscribeToState(stateId: string, listener: (state: TwinState) => void): void {
    const listeners = this._stateSubscriptions.get(stateId) || [];
    listeners.push(listener);
    this._stateSubscriptions.set(stateId, listeners);
  }

  unsubscribeFromState(stateId: string, listener: (state: TwinState) => void): void {
    const listeners = this._stateSubscriptions.get(stateId) || [];
    const idx = listeners.indexOf(listener);
    if (idx >= 0) {
      listeners.splice(idx, 1);
      this._stateSubscriptions.set(stateId, listeners);
    }
  }

  computeSyncHealth(sourceId: string): SyncHealth {
    const events = this._syncEvents.filter(e => e.sourceId === sourceId);
    const recentEvents = events.filter(e => Date.now() - e.timestamp < 60000);
    const successful = recentEvents.filter(e => e.success);

    const avgLatency = recentEvents.length > 0
      ? recentEvents.reduce((sum, e) => sum + e.latency, 0) / recentEvents.length
      : 0;

    const successRate = recentEvents.length > 0
      ? successful.length / recentEvents.length
      : 0;

    let status: 'healthy' | 'degraded' | 'critical' | 'offline' = 'healthy';
    if (successRate < 0.5) status = 'offline';
    else if (successRate < 0.8) status = 'critical';
    else if (avgLatency > 500 || successRate < 0.95) status = 'degraded';

    const health: SyncHealth = {
      sourceId,
      lastSyncTime: recentEvents.length > 0 ? recentEvents[recentEvents.length - 1].timestamp : 0,
      averageLatency: avgLatency,
      syncSuccessRate: successRate,
      driftRate: this._driftCompensation.get(sourceId) || 0,
      status
    };

    this._healthMetrics.set(sourceId, health);
    return health;
  }

  compensateLatency(state: TwinState): TwinState {
    if (!this._latencyCompensation.enabled) return state;

    const compensated = { ...state };
    compensated.values = new Map(state.values);

    if (this._latencyCompensation.compensationMethod === 'extrapolation') {
      const history = this._stateHistory.get(state.id);
      if (history && history.entries.length >= 2) {
        const recent = history.entries.slice(-2);
        const dt = recent[1].timestamp - recent[0].timestamp;
        for (const [key, val] of recent[1].values) {
          if (typeof val === 'number') {
            const prev = recent[0].values.get(key) as number;
            const trend = dt > 0 ? (val - prev) / dt : 0;
            compensated.values.set(key, val + trend * this._latencyCompensation.estimatedLatency);
          }
        }
      }
    }

    return compensated;
  }

  detectConflict(stateA: TwinState, stateB: TwinState): boolean {
    if (stateA.id !== stateB.id) return false;
    if (stateA.timestamp === stateB.timestamp) {
      for (const [key, valA] of stateA.values) {
        const valB = stateB.values.get(key);
        if (valA !== valB) return true;
      }
    }
    return false;
  }

  resolveConflict(stateA: TwinState, stateB: TwinState): TwinState {
    switch (this._conflictResolution) {
      case 'latest':
        return stateA.timestamp > stateB.timestamp ? stateA : stateB;
      case 'priority':
        return stateA.quality > stateB.quality ? stateA : stateB;
      case 'merge': {
        const merged = { ...stateA };
        merged.values = new Map(stateA.values);
        for (const [key, val] of stateB.values) {
          if (!merged.values.has(key)) {
            merged.values.set(key, val);
          }
        }
        return merged;
      }
      default:
        return stateA;
    }
  }

  acquireSyncLock(resourceId: string): boolean {
    if (this._syncLock.get(resourceId)) return false;
    this._syncLock.set(resourceId, true);
    return true;
  }

  releaseSyncLock(resourceId: string): void {
    this._syncLock.set(resourceId, false);
  }

  estimateDrift(sourceId: string, referenceTime: number): number {
    const history = this._stateHistory.get(sourceId);
    if (!history || history.entries.length < 2) return 0;

    const recent = history.entries.slice(-10);
    let totalDrift = 0;
    for (let i = 1; i < recent.length; i++) {
      totalDrift += recent[i].timestamp - recent[i - 1].timestamp - this._syncInterval;
    }
    const avgDrift = totalDrift / Math.max(recent.length - 1, 1);
    this._driftCompensation.set(sourceId, avgDrift);
    return avgDrift;
  }

  flushBuffer(): TwinState[] {
    const flushed = [...this._buffer];
    this._buffer = [];
    return flushed;
  }

  clearHistory(stateId?: string): void {
    if (stateId) {
      this._stateHistory.delete(stateId);
    } else {
      this._stateHistory.clear();
    }
  }

  exportHistory(stateId: string): string {
    const history = this._stateHistory.get(stateId);
    return history ? JSON.stringify(history.entries, null, 2) : '';
  }

  getAuditTrail(): { timestamp: number; action: string; details: string }[] {
    return [...this._auditTrail];
  }

  private _audit(action: string, details: string): void {
    this._auditTrail.push({ timestamp: Date.now(), action, details });
    if (this._auditTrail.length > 10000) {
      this._auditTrail.shift();
    }
  }

  getSyncStatistics(): Record<string, number> {
    return {
      totalEvents: this._syncEvents.length,
      successfulEvents: this._syncEvents.filter(e => e.success).length,
      failedEvents: this._syncEvents.filter(e => !e.success).length,
      averageLatency: this._syncEvents.length > 0
        ? this._syncEvents.reduce((sum, e) => sum + e.latency, 0) / this._syncEvents.length
        : 0,
      totalStates: this._stateHistory.size,
      totalHistoryEntries: Array.from(this._stateHistory.values()).reduce((sum, h) => sum + h.entries.length, 0),
      bufferSize: this._buffer.length,
      activePredictors: this._predictors.size,
      activeCorrections: Array.from(this._correctionMechanisms.values()).filter(m => m.enabled).length
    };
  }

  toPacket(): DataPacket<TwinState> {
    const result = this._currentState || {
      id: '',
      timestamp: Date.now(),
      values: new Map(),
      quality: 0,
      source: '',
      version: 0,
      checksum: ''
    };
    this._counter++;
    return {
      id: `state-sync-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital-twin', 'state-synchronization'],
        priority: 1,
        phase: 'synchronization'
      }
    };
  }

  reset(): void {
    this._currentState = null;
    this._stateHistory.clear();
    this._syncConfigs.clear();
    this._latencyCompensation = {
      enabled: true,
      estimatedLatency: 0,
      compensationMethod: 'extrapolation',
      bufferDepth: 10,
      maxCompensatedLatency: 500,
      confidenceThreshold: 0.8
    };
    this._predictors.clear();
    this._correctionMechanisms.clear();
    this._syncEvents = [];
    this._lastSyncTime = 0;
    this._counter = 0;
    this._syncInterval = 1000;
    this._isRunning = false;
    this._buffer = [];
    this._maxBufferSize = 1000;
    this._timeSyncConfig = {
      protocol: 'ntp',
      pollingInterval: 64,
      accuracyThreshold: 10,
      timezone: 'UTC',
      daylightSaving: false
    };
    this._healthMetrics.clear();
    this._stateSubscriptions.clear();
    this._syncLock.clear();
    this._driftCompensation.clear();
    this._batchSize = 50;
    this._conflictResolution = 'latest';
    this._auditTrail = [];
    this._initDefaultPredictors();
    this._initDefaultCorrectionMechanisms();
  }
}
