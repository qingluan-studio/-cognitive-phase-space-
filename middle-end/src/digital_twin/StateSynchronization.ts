import { DataPacket } from '../shared/types';

export interface TwinState {
  twinId: string;
  timestamp: number;
  state: Record<string, number>;
  confidence: number;
  source: 'physical' | 'virtual' | 'fused';
}

export interface RealTimeSyncConfig {
  id: string;
  twinId: string;
  protocol: 'mqtt' | 'opc_ua' | 'websocket' | 'grpc' | 'http';
  endpoint: string;
  updateInterval: number;
  retryInterval: number;
  maxRetries: number;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastSyncTime: number;
  syncCount: number;
}

export interface LatencyCompensation {
  id: string;
  twinId: string;
  measuredLatency: number;
  smoothedLatency: number;
  jitter: number;
  compensationStrategy: 'predictive' | 'buffering' | 'adaptive_delay' | 'none';
  bufferSize: number;
  predictionHorizon: number;
  lastCompensatedTime: number;
}

export interface StatePredictor {
  id: string;
  twinId: string;
  algorithm: 'kalman_filter' | 'linear_extrapolation' | 'polynomial' | 'lstm' | 'hybrid';
  modelParameters: Record<string, number>;
  predictionHorizon: number;
  accuracy: number;
  lastPredictionTime: number;
  predictions: Record<string, number>;
}

export interface CorrectionMechanism {
  id: string;
  twinId: string;
  method: 'proportional' | 'pid' | 'adaptive' | 'optimization';
  threshold: number;
  maxCorrection: number;
  correctionGain: number;
  integralTerm: number;
  lastCorrection: number;
  correctionCount: number;
}

export interface StateSynchronizationResult {
  realTimeConfigs: RealTimeSyncConfig[];
  latencyCompensations: LatencyCompensation[];
  statePredictors: StatePredictor[];
  correctionMechanisms: CorrectionMechanism[];
  syncStatus: {
    syncedTwins: number;
    avgLatency: number;
    syncAccuracy: number;
    drift: number;
  };
  overallStatus: 'synced' | 'syncing' | 'out_of_sync' | 'degraded';
}

export class StateSynchronization {
  private _states: Map<string, TwinState> = new Map();
  private _realTimeConfigs: Map<string, RealTimeSyncConfig> = new Map();
  private _latencyCompensations: Map<string, LatencyCompensation> = new Map();
  private _statePredictors: Map<string, StatePredictor> = new Map();
  private _correctionMechanisms: Map<string, CorrectionMechanism> = new Map();
  private _counter: number = 0;
  private _lastResult: StateSynchronizationResult | null = null;
  private _syncHistory: Map<string, { time: number; latency: number; drift: number }[]> = new Map();
  private _syncStats: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    avgLatency: number;
    maxLatency: number;
    minLatency: number;
    avgDrift: number;
  } = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: Infinity,
    avgDrift: 0,
  };
  private _connectionPool: Map<string, { connected: boolean; lastHeartbeat: number }> = new Map();
  private _syncPolicies: Map<string, {
    mode: 'push' | 'pull' | 'hybrid';
    priority: number;
    consistency: 'strong' | 'eventual' | 'weak';
  }> = new Map();

  constructor() {
    this._initDefaultPolicies();
  }

  private _initDefaultPolicies(): void {
    const policies = [
      { name: 'realtime', config: { mode: 'push' as const, priority: 0, consistency: 'strong' as const } },
      { name: 'near_realtime', config: { mode: 'hybrid' as const, priority: 1, consistency: 'eventual' as const } },
      { name: 'periodic', config: { mode: 'pull' as const, priority: 2, consistency: 'eventual' as const } },
      { name: 'on_demand', config: { mode: 'pull' as const, priority: 3, consistency: 'weak' as const } },
    ];
    policies.forEach(p => this._syncPolicies.set(p.name, p.config));
  }

  get states(): TwinState[] {
    return Array.from(this._states.values());
  }

  get realTimeConfigs(): RealTimeSyncConfig[] {
    return Array.from(this._realTimeConfigs.values());
  }

  get latencyCompensations(): LatencyCompensation[] {
    return Array.from(this._latencyCompensations.values());
  }

  get statePredictors(): StatePredictor[] {
    return Array.from(this._statePredictors.values());
  }

  get correctionMechanisms(): CorrectionMechanism[] {
    return Array.from(this._correctionMechanisms.values());
  }

  get syncedTwinCount(): number {
    let count = 0;
    for (const config of this._realTimeConfigs.values()) {
      if (config.status === 'connected') count++;
    }
    return count;
  }

  get avgLatency(): number {
    return this._syncStats.avgLatency;
  }

  get syncAccuracy(): number {
    if (this._syncStats.totalSyncs === 0) return 0;
    return this._syncStats.successfulSyncs / this._syncStats.totalSyncs;
  }

  get syncStats(): {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    avgLatency: number;
    maxLatency: number;
    minLatency: number;
    avgDrift: number;
  } {
    return { ...this._syncStats };
  }

  createRealTimeSync(
    twinId: string,
    protocol: 'mqtt' | 'opc_ua' | 'websocket' | 'grpc' | 'http',
    params: {
      endpoint?: string;
      updateInterval?: number;
      retryInterval?: number;
      maxRetries?: number;
    } = {}
  ): RealTimeSyncConfig {
    const id = `rt-sync-${Date.now()}-${this._counter++}`;
    const config: RealTimeSyncConfig = {
      id,
      twinId,
      protocol,
      endpoint: params.endpoint ?? '',
      updateInterval: params.updateInterval ?? 100,
      retryInterval: params.retryInterval ?? 5000,
      maxRetries: params.maxRetries ?? 3,
      status: 'disconnected',
      lastSyncTime: 0,
      syncCount: 0,
    };
    this._realTimeConfigs.set(id, config);
    this._connectionPool.set(id, { connected: false, lastHeartbeat: 0 });
    if (!this._states.has(twinId)) {
      this._states.set(twinId, {
        twinId,
        timestamp: 0,
        state: {},
        confidence: 0,
        source: 'virtual',
      });
    }
    return config;
  }

  createLatencyCompensation(
    twinId: string,
    strategy: 'predictive' | 'buffering' | 'adaptive_delay' | 'none',
    params: {
      bufferSize?: number;
      predictionHorizon?: number;
    } = {}
  ): LatencyCompensation {
    const id = `lat-comp-${Date.now()}-${this._counter++}`;
    const compensation: LatencyCompensation = {
      id,
      twinId,
      measuredLatency: 0,
      smoothedLatency: 0,
      jitter: 0,
      compensationStrategy: strategy,
      bufferSize: params.bufferSize ?? 100,
      predictionHorizon: params.predictionHorizon ?? 100,
      lastCompensatedTime: 0,
    };
    this._latencyCompensations.set(id, compensation);
    return compensation;
  }

  createStatePredictor(
    twinId: string,
    algorithm: 'kalman_filter' | 'linear_extrapolation' | 'polynomial' | 'lstm' | 'hybrid',
    params: {
      modelParameters?: Record<string, number>;
      predictionHorizon?: number;
    } = {}
  ): StatePredictor {
    const id = `pred-${Date.now()}-${this._counter++}`;
    const predictor: StatePredictor = {
      id,
      twinId,
      algorithm,
      modelParameters: params.modelParameters ?? {},
      predictionHorizon: params.predictionHorizon ?? 10,
      accuracy: 0.8,
      lastPredictionTime: 0,
      predictions: {},
    };
    if (algorithm === 'kalman_filter') {
      predictor.modelParameters = {
        processNoise: 0.01,
        measurementNoise: 0.1,
        estimationError: 1,
        ...params.modelParameters,
      };
    }
    this._statePredictors.set(id, predictor);
    return predictor;
  }

  createCorrectionMechanism(
    twinId: string,
    method: 'proportional' | 'pid' | 'adaptive' | 'optimization',
    params: {
      threshold?: number;
      maxCorrection?: number;
      correctionGain?: number;
    } = {}
  ): CorrectionMechanism {
    const id = `corr-${Date.now()}-${this._counter++}`;
    const mechanism: CorrectionMechanism = {
      id,
      twinId,
      method,
      threshold: params.threshold ?? 0.01,
      maxCorrection: params.maxCorrection ?? 1,
      correctionGain: params.correctionGain ?? 0.1,
      integralTerm: 0,
      lastCorrection: 0,
      correctionCount: 0,
    };
    this._correctionMechanisms.set(id, mechanism);
    return mechanism;
  }

  connectSync(syncId: string): boolean {
    const config = this._realTimeConfigs.get(syncId);
    if (!config) return false;
    config.status = 'connecting';
    config.status = 'connected';
    const conn = this._connectionPool.get(syncId);
    if (conn) {
      conn.connected = true;
      conn.lastHeartbeat = Date.now();
    }
    return true;
  }

  disconnectSync(syncId: string): boolean {
    const config = this._realTimeConfigs.get(syncId);
    if (!config) return false;
    config.status = 'disconnected';
    const conn = this._connectionPool.get(syncId);
    if (conn) {
      conn.connected = false;
    }
    return true;
  }

  updateState(twinId: string, state: Record<string, number>, source: 'physical' | 'virtual' | 'fused' = 'physical'): boolean {
    const existing = this._states.get(twinId);
    const timestamp = Date.now();
    const newState: TwinState = {
      twinId,
      timestamp,
      state: { ...state },
      confidence: 0.95,
      source,
    };
    this._states.set(twinId, newState);
    this._recordSyncHistory(twinId, timestamp);
    if (existing) {
      this._applyCompensation(twinId, timestamp - existing.timestamp);
      const drift = this._calculateDrift(existing.state, state);
      this._correctState(twinId, drift);
    }
    this._syncStats.totalSyncs++;
    this._syncStats.successfulSyncs++;
    return true;
  }

  syncState(syncId: string, state: Record<string, number>): { synced: boolean; latency: number; drift: number } {
    const config = this._realTimeConfigs.get(syncId);
    if (!config || config.status !== 'connected') {
      return { synced: false, latency: 0, drift: 0 };
    }
    const startTime = Date.now();
    const twinId = config.twinId;
    const existing = this._states.get(twinId);
    const latency = startTime - config.lastSyncTime;
    let drift = 0;
    if (existing) {
      drift = this._calculateDrift(existing.state, state);
    }
    this.updateState(twinId, state, 'physical');
    config.lastSyncTime = startTime;
    config.syncCount++;
    this._updateLatencyStats(latency);
    return { synced: true, latency, drift };
  }

  predictState(predictorId: string, steps: number = 1): { predictions: Record<string, number[]>; accuracy: number } {
    const predictor = this._statePredictors.get(predictorId);
    if (!predictor) return { predictions: {}, accuracy: 0 };
    const currentState = this._states.get(predictor.twinId);
    if (!currentState) return { predictions: {}, accuracy: 0 };
    const result: Record<string, number[]> = {};
    for (const key of Object.keys(currentState.state)) {
      result[key] = [];
      let currentValue = currentState.state[key];
      for (let i = 0; i < steps; i++) {
        const predicted = this._predictNextValue(predictor, key, currentValue, i);
        result[key].push(predicted);
        currentValue = predicted;
      }
    }
    predictor.predictions = {};
    for (const key of Object.keys(result)) {
      predictor.predictions[key] = result[key][result[key].length - 1];
    }
    predictor.lastPredictionTime = Date.now();
    return { predictions: result, accuracy: predictor.accuracy };
  }

  private _predictNextValue(
    predictor: StatePredictor,
    variable: string,
    currentValue: number,
    step: number
  ): number {
    switch (predictor.algorithm) {
      case 'linear_extrapolation':
        const trend = predictor.modelParameters[`${variable}_trend`] ?? 0;
        return currentValue + trend * (step + 1);
      case 'kalman_filter':
        const processNoise = predictor.modelParameters.processNoise ?? 0.01;
        const noise = (Math.random() - 0.5) * processNoise;
        return currentValue + noise;
      case 'polynomial':
        const a = predictor.modelParameters[`${variable}_a`] ?? 0;
        const b = predictor.modelParameters[`${variable}_b`] ?? 0;
        const c = predictor.modelParameters[`${variable}_c`] ?? currentValue;
        const t = step + 1;
        return a * t * t + b * t + c;
      default:
        return currentValue;
    }
  }

  applyCorrection(correctionId: string, measuredState: Record<string, number>): { corrected: boolean; correctionAmount: number } {
    const mechanism = this._correctionMechanisms.get(correctionId);
    if (!mechanism) return { corrected: false, correctionAmount: 0 };
    const currentState = this._states.get(mechanism.twinId);
    if (!currentState) return { corrected: false, correctionAmount: 0 };
    const drift = this._calculateDrift(currentState.state, measuredState);
    if (Math.abs(drift) < mechanism.threshold) {
      return { corrected: false, correctionAmount: 0 };
    }
    const correction = this._computeCorrection(mechanism, drift);
    const correctedState: Record<string, number> = {};
    for (const key of Object.keys(currentState.state)) {
      const measured = measuredState[key] ?? currentState.state[key];
      const diff = measured - currentState.state[key];
      correctedState[key] = currentState.state[key] + diff * correction;
    }
    this.updateState(mechanism.twinId, correctedState, 'fused');
    mechanism.lastCorrection = correction;
    mechanism.correctionCount++;
    return { corrected: true, correctionAmount: correction };
  }

  private _computeCorrection(mechanism: CorrectionMechanism, drift: number): number {
    const absDrift = Math.abs(drift);
    let correction = 0;
    switch (mechanism.method) {
      case 'proportional':
        correction = mechanism.correctionGain * absDrift;
        break;
      case 'pid':
        mechanism.integralTerm += absDrift;
        const derivative = absDrift - mechanism.lastCorrection;
        correction = mechanism.correctionGain * absDrift + 0.01 * mechanism.integralTerm + 0.1 * derivative;
        break;
      case 'adaptive':
        const baseGain = mechanism.correctionGain;
        const adaptiveGain = baseGain * (1 + absDrift * 10);
        correction = Math.min(adaptiveGain * absDrift, mechanism.maxCorrection);
        break;
      case 'optimization':
        correction = Math.min(absDrift, mechanism.maxCorrection);
        break;
    }
    return Math.min(correction, mechanism.maxCorrection);
  }

  measureLatency(compensationId: string): {
    measured: number;
    smoothed: number;
    jitter: number;
  } {
    const compensation = this._latencyCompensations.get(compensationId);
    if (!compensation) return { measured: 0, smoothed: 0, jitter: 0 };
    const measured = Math.random() * 50 + 10;
    const alpha = 0.2;
    const previousSmoothed = compensation.smoothedLatency;
    const smoothed = alpha * measured + (1 - alpha) * previousSmoothed;
    const jitter = Math.abs(measured - previousSmoothed);
    compensation.measuredLatency = measured;
    compensation.smoothedLatency = smoothed;
    compensation.jitter = jitter;
    compensation.lastCompensatedTime = Date.now();
    return { measured, smoothed, jitter };
  }

  getState(twinId: string): TwinState | null {
    return this._states.get(twinId) ?? null;
  }

  getSyncHistory(twinId: string, limit?: number): { time: number; latency: number; drift: number }[] {
    const history = this._syncHistory.get(twinId) ?? [];
    if (limit === undefined) return [...history];
    return history.slice(-limit);
  }

  getPolicyNames(): string[] {
    return Array.from(this._syncPolicies.keys());
  }

  getSyncPolicy(name: string): {
    mode: 'push' | 'pull' | 'hybrid';
    priority: number;
    consistency: 'strong' | 'eventual' | 'weak';
  } | null {
    return this._syncPolicies.get(name) ?? null;
  }

  private _calculateDrift(stateA: Record<string, number>, stateB: Record<string, number>): number {
    const keysA = Object.keys(stateA);
    const keysB = Object.keys(stateB);
    const allKeys = new Set([...keysA, ...keysB]);
    if (allKeys.size === 0) return 0;
    let totalDiff = 0;
    let count = 0;
    for (const key of allKeys) {
      const valA = stateA[key] ?? 0;
      const valB = stateB[key] ?? 0;
      const maxVal = Math.max(Math.abs(valA), Math.abs(valB), 1);
      totalDiff += Math.abs(valA - valB) / maxVal;
      count++;
    }
    return count > 0 ? totalDiff / count : 0;
  }

  private _applyCompensation(twinId: string, latency: number): void {
    for (const compensation of this._latencyCompensations.values()) {
      if (compensation.twinId === twinId) {
        compensation.measuredLatency = latency;
        const alpha = 0.1;
        compensation.smoothedLatency = alpha * latency + (1 - alpha) * compensation.smoothedLatency;
        compensation.jitter = Math.abs(latency - compensation.smoothedLatency);
        compensation.lastCompensatedTime = Date.now();
        break;
      }
    }
  }

  private _correctState(twinId: string, drift: number): void {
    for (const mechanism of this._correctionMechanisms.values()) {
      if (mechanism.twinId === twinId && Math.abs(drift) > mechanism.threshold) {
        mechanism.lastCorrection = drift * mechanism.correctionGain;
        mechanism.correctionCount++;
        break;
      }
    }
  }

  private _recordSyncHistory(twinId: string, time: number): void {
    if (!this._syncHistory.has(twinId)) {
      this._syncHistory.set(twinId, []);
    }
    const history = this._syncHistory.get(twinId)!;
    history.push({ time, latency: 0, drift: 0 });
    if (history.length > 1000) {
      history.shift();
    }
  }

  private _updateLatencyStats(latency: number): void {
    const total = this._syncStats.totalSyncs;
    this._syncStats.avgLatency = (this._syncStats.avgLatency * (total - 1) + latency) / total;
    this._syncStats.maxLatency = Math.max(this._syncStats.maxLatency, latency);
    this._syncStats.minLatency = Math.min(this._syncStats.minLatency, latency);
  }

  toPacket(): DataPacket<StateSynchronizationResult> {
    const result: StateSynchronizationResult = {
      realTimeConfigs: Array.from(this._realTimeConfigs.values()),
      latencyCompensations: Array.from(this._latencyCompensations.values()),
      statePredictors: Array.from(this._statePredictors.values()),
      correctionMechanisms: Array.from(this._correctionMechanisms.values()),
      syncStatus: {
        syncedTwins: this.syncedTwinCount,
        avgLatency: this._syncStats.avgLatency,
        syncAccuracy: this.syncAccuracy,
        drift: this._syncStats.avgDrift,
      },
      overallStatus:
        this.syncedTwinCount === 0
          ? 'out_of_sync'
          : this.syncAccuracy > 0.95
          ? 'synced'
          : this.syncAccuracy > 0.8
          ? 'syncing'
          : 'degraded',
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `state-sync-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'state_synchronization'],
        priority: 1,
        phase: 'synchronization',
      },
    };
  }

  reset(): void {
    this._states.clear();
    this._realTimeConfigs.clear();
    this._latencyCompensations.clear();
    this._statePredictors.clear();
    this._correctionMechanisms.clear();
    this._counter = 0;
    this._lastResult = null;
    this._syncHistory.clear();
    this._connectionPool.clear();
    this._syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      avgLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      avgDrift: 0,
    };
  }
}
