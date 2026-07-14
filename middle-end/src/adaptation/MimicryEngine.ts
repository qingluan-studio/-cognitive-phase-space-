export interface ResponseSample {
  endpoint: string;
  status: number;
  body: Record<string, unknown>;
  latency: number;
  timestamp: number;
}

export interface TransitionProbability {
  from: number;
  to: number;
  probability: number;
}

export interface MimicryModel {
  endpoint: string;
  averageLatency: number;
  latencyStdDev: number;
  statusDistribution: Map<number, number>;
  transitionMatrix: TransitionProbability[];
  bodyTemplate: Record<string, unknown>;
  fieldStatistics: Map<string, { mean: number; std: number; type: string }>;
  sampleSize: number;
  fidelity: number;
  entropy: number;
}

export interface MimicryRequest {
  endpoint: string;
  payload: Record<string, unknown>;
}

export interface MimicryResult {
  endpoint: string;
  status: number;
  body: Record<string, unknown>;
  latency: number;
  synthetic: true;
  confidence: number;
}

export class MimicryEngine {
  private _samples: Map<string, ResponseSample[]> = new Map();
  private _models: Map<string, MimicryModel> = new Map();
  private _maxSamples = 200;
  private _lastStatus: Map<string, number> = new Map();

  observeResponse(sample: ResponseSample): void {
    const bucket = this._samples.get(sample.endpoint) ?? [];
    bucket.push(sample);
    if (bucket.length > this._maxSamples) bucket.shift();
    this._samples.set(sample.endpoint, bucket);
    this._lastStatus.set(sample.endpoint, sample.status);
  }

  trainModel(endpoint: string): MimicryModel {
    const samples = this._samples.get(endpoint) ?? [];
    if (samples.length === 0) throw new Error(`No samples for endpoint: ${endpoint}`);

    const latencies = samples.map(s => s.latency);
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const variance = latencies.reduce((sum, l) => sum + Math.pow(l - averageLatency, 2), 0) / latencies.length;
    const latencyStdDev = Math.sqrt(variance);

    const statusDist = new Map<number, number>();
    for (const s of samples) {
      statusDist.set(s.status, (statusDist.get(s.status) ?? 0) + 1);
    }

    const transitionMatrix = this._buildTransitionMatrix(samples);
    const bodyTemplate = this._mergeTemplates(samples.map(s => s.body));
    const fieldStatistics = this._computeFieldStatistics(samples);
    const entropy = this._computeEntropy(statusDist);
    const fidelity = Math.min(1, samples.length / this._maxSamples);

    const model: MimicryModel = {
      endpoint,
      averageLatency,
      latencyStdDev,
      statusDistribution: statusDist,
      transitionMatrix,
      bodyTemplate,
      fieldStatistics,
      sampleSize: samples.length,
      fidelity,
      entropy,
    };
    this._models.set(endpoint, model);
    return model;
  }

  private _buildTransitionMatrix(samples: ResponseSample[]): TransitionProbability[] {
    const transitions = new Map<string, number>();
    const fromCounts = new Map<number, number>();

    for (let i = 1; i < samples.length; i++) {
      const from = samples[i - 1].status;
      const to = samples[i].status;
      const key = `${from}->${to}`;
      transitions.set(key, (transitions.get(key) ?? 0) + 1);
      fromCounts.set(from, (fromCounts.get(from) ?? 0) + 1);
    }

    const matrix: TransitionProbability[] = [];
    for (const [key, count] of transitions) {
      const [fromStr, toStr] = key.split('->');
      const from = parseInt(fromStr, 10);
      const to = parseInt(toStr, 10);
      const total = fromCounts.get(from) ?? 1;
      matrix.push({ from, to, probability: count / total });
    }
    return matrix;
  }

  private _mergeTemplates(bodies: Record<string, unknown>[]): Record<string, unknown> {
    const template: Record<string, unknown> = {};
    const fieldCounts = new Map<string, number>();

    for (const body of bodies) {
      for (const key of Object.keys(body)) {
        fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1);
        if (!(key in template)) template[key] = body[key];
      }
    }

    for (const [key, count] of fieldCounts) {
      if (count < bodies.length * 0.5) delete template[key];
    }
    return template;
  }

  private _computeFieldStatistics(samples: ResponseSample[]): Map<string, { mean: number; std: number; type: string }> {
    const stats = new Map<string, number[]>();

    for (const sample of samples) {
      for (const [key, value] of Object.entries(sample.body)) {
        if (typeof value === 'number') {
          const values = stats.get(key) ?? [];
          values.push(value);
          stats.set(key, values);
        }
      }
    }

    const result = new Map<string, { mean: number; std: number; type: string }>();
    for (const [key, values] of stats) {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      result.set(key, { mean, std: Math.sqrt(variance), type: 'numeric' });
    }
    return result;
  }

  private _computeEntropy(dist: Map<number, number>): number {
    const total = Array.from(dist.values()).reduce((a, b) => a + b, 0) || 1;
    let entropy = 0;
    for (const count of dist.values()) {
      const prob = count / total;
      entropy -= prob * Math.log2(prob);
    }
    return entropy;
  }

  private _pickStatusWithTransition(endpoint: string, dist: Map<number, number>): number {
    const lastStatus = this._lastStatus.get(endpoint);
    if (lastStatus !== undefined) {
      const model = this._models.get(endpoint);
      if (model) {
        const transitions = model.transitionMatrix.filter(t => t.from === lastStatus);
        if (transitions.length > 0) {
          let r = Math.random();
          for (const t of transitions) {
            r -= t.probability;
            if (r <= 0) return t.to;
          }
        }
      }
    }

    const total = Array.from(dist.values()).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [status, count] of dist) {
      r -= count;
      if (r <= 0) return status;
    }
    return 200;
  }

  private _generateVariedBody(model: MimicryModel, base: Record<string, unknown>): Record<string, unknown> {
    const result = { ...base };

    for (const [key, stat] of model.fieldStatistics) {
      if (stat.type === 'numeric' && result[key] !== undefined) {
        const variation = (Math.random() - 0.5) * 2 * stat.std;
        result[key] = Number(result[key]) + variation;
      }
    }

    return result;
  }

  generateMimic(request: MimicryRequest): MimicryResult {
    const model = this._models.get(request.endpoint);
    if (!model) throw new Error(`No trained model for: ${request.endpoint}`);

    const status = this._pickStatusWithTransition(request.endpoint, model.statusDistribution);
    const baseBody = { ...model.bodyTemplate, ...request.payload };
    const variedBody = this._generateVariedBody(model, baseBody);

    const latencyNoise = (Math.random() - 0.5) * 2 * model.latencyStdDev;
    const latency = Math.max(0, model.averageLatency + latencyNoise);

    const confidence = 1 - model.entropy / 4;

    this._lastStatus.set(request.endpoint, status);

    return {
      endpoint: request.endpoint,
      status,
      body: variedBody,
      latency,
      synthetic: true,
      confidence,
    };
  }

  validateMimicry(endpoint: string, real: ResponseSample): boolean {
    const model = this._models.get(endpoint);
    if (!model) return false;

    const latencyDiff = Math.abs(real.latency - model.averageLatency);
    const latencyOk = latencyDiff < model.latencyStdDev * 2;

    const statusProb = model.statusDistribution.get(real.status) ?? 0;
    const statusOk = statusProb > 0;

    return latencyOk && statusOk;
  }

  getModelFidelity(endpoint: string): number {
    return this._models.get(endpoint)?.fidelity ?? 0;
  }

  pruneSamples(endpoint: string, keep: number): void {
    const bucket = this._samples.get(endpoint);
    if (bucket && bucket.length > keep) {
      this._samples.set(endpoint, bucket.slice(-keep));
    }
  }

  getObservedEndpoints(): string[] {
    return Array.from(this._samples.keys());
  }

  get modelCount(): number {
    return this._models.size;
  }

  getEndpointEntropy(endpoint: string): number {
    return this._models.get(endpoint)?.entropy ?? 0;
  }
}