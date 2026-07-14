/**
 * 拟态引擎：观察后端历史响应样本，训练足够逼真的模型，
 * 在后端不可用时生成足以骗过前端的模拟输出，维持前端体验连续性。
 */

export interface ResponseSample {
  endpoint: string;
  status: number;
  body: Record<string, unknown>;
  latency: number;
  timestamp: number;
}

export interface MimicryModel {
  endpoint: string;
  averageLatency: number;
  statusDistribution: Map<number, number>;
  bodyTemplate: Record<string, unknown>;
  sampleSize: number;
  fidelity: number;
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
}

export class MimicryEngine {
  private _samples: Map<string, ResponseSample[]> = new Map();
  private _models: Map<string, MimicryModel> = new Map();
  private _maxSamples = 200;

  observeResponse(sample: ResponseSample): void {
    const bucket = this._samples.get(sample.endpoint) ?? [];
    bucket.push(sample);
    if (bucket.length > this._maxSamples) bucket.shift();
    this._samples.set(sample.endpoint, bucket);
  }

  trainModel(endpoint: string): MimicryModel {
    const samples = this._samples.get(endpoint) ?? [];
    if (samples.length === 0) throw new Error(`No samples for endpoint: ${endpoint}`);

    const latency =
      samples.reduce((sum, s) => sum + s.latency, 0) / samples.length;
    const statusDist = new Map<number, number>();
    for (const s of samples) {
      statusDist.set(s.status, (statusDist.get(s.status) ?? 0) + 1);
    }
    const bodyTemplate = this._mergeTemplates(samples.map(s => s.body));
    const fidelity = Math.min(1, samples.length / this._maxSamples);

    const model: MimicryModel = {
      endpoint,
      averageLatency: latency,
      statusDistribution: statusDist,
      bodyTemplate,
      sampleSize: samples.length,
      fidelity,
    };
    this._models.set(endpoint, model);
    return model;
  }

  private _mergeTemplates(bodies: Record<string, unknown>[]): Record<string, unknown> {
    const template: Record<string, unknown> = {};
    for (const body of bodies) {
      for (const key of Object.keys(body)) {
        if (!(key in template)) template[key] = body[key];
      }
    }
    return template;
  }

  private _pickStatus(dist: Map<number, number>): number {
    const total = Array.from(dist.values()).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [status, count] of dist) {
      r -= count;
      if (r <= 0) return status;
    }
    return 200;
  }

  generateMimic(request: MimicryRequest): MimicryResult {
    const model = this._models.get(request.endpoint);
    if (!model) throw new Error(`No trained model for: ${request.endpoint}`);
    const status = this._pickStatus(model.statusDistribution);
    const body = { ...model.bodyTemplate, ...request.payload };
    return {
      endpoint: request.endpoint,
      status,
      body,
      latency: model.averageLatency * (0.8 + Math.random() * 0.4),
      synthetic: true,
    };
  }

  validateMimicry(endpoint: string, real: ResponseSample): boolean {
    const model = this._models.get(endpoint);
    if (!model) return false;
    const latencyDiff = Math.abs(real.latency - model.averageLatency);
    return latencyDiff < model.averageLatency * 0.5;
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
}
