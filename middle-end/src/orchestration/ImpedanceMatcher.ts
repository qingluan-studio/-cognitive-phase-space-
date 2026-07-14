export type ImpedanceProfile = {
  bandwidth: number;
  latency: number;
  packetSize: number;
  compressionRatio: number;
  protocol: 'http' | 'grpc' | 'websocket';
};

export type ComplexImpedance = {
  real: number;
  imaginary: number;
};

export type SmithChartPoint = {
  r: number;
  x: number;
  normalized: boolean;
};

export type MatcherResult = {
  matched: boolean;
  sourceProfile: ImpedanceProfile;
  targetProfile: ImpedanceProfile;
  transformationRatio: number;
  adjustedLatency: number;
  reflectionCoefficient: number;
  standingWaveRatio: number;
};

export class ImpedanceMatcher {
  private _sourceProfile: ImpedanceProfile = {
    bandwidth: 100,
    latency: 50,
    packetSize: 1024,
    compressionRatio: 1,
    protocol: 'http',
  };

  private _targetProfile: ImpedanceProfile = {
    bandwidth: 100,
    latency: 50,
    packetSize: 1024,
    compressionRatio: 1,
    protocol: 'http',
  };

  private _characteristicImpedance = 50;

  get sourceProfile(): ImpedanceProfile {
    return { ...this._sourceProfile };
  }

  get targetProfile(): ImpedanceProfile {
    return { ...this._targetProfile };
  }

  get characteristicImpedance(): number {
    return this._characteristicImpedance;
  }

  setSourceProfile(profile: Partial<ImpedanceProfile>): void {
    this._sourceProfile = { ...this._sourceProfile, ...profile };
  }

  setTargetProfile(profile: Partial<ImpedanceProfile>): void {
    this._targetProfile = { ...this._targetProfile, ...profile };
  }

  setCharacteristicImpedance(impedance: number): void {
    this._characteristicImpedance = Math.max(1, impedance);
  }

  private _toComplexImpedance(profile: ImpedanceProfile): ComplexImpedance {
    const frequency = profile.bandwidth * 1e6;
    const inductance = profile.latency * 1e-6;
    const capacitance = profile.packetSize / (profile.bandwidth * 1e6);
    
    return {
      real: profile.compressionRatio * 10,
      imaginary: 2 * Math.PI * frequency * inductance - 1 / (2 * Math.PI * frequency * capacitance),
    };
  }

  private _normalizeImpedance(z: ComplexImpedance): ComplexImpedance {
    return {
      real: z.real / this._characteristicImpedance,
      imaginary: z.imaginary / this._characteristicImpedance,
    };
  }

  private _toSmithChart(z: ComplexImpedance): SmithChartPoint {
    const normalized = this._normalizeImpedance(z);
    const r = normalized.real;
    const x = normalized.imaginary;
    
    return { r, x, normalized: true };
  }

  private _computeReflectionCoefficient(z: ComplexImpedance): number {
    const zn = this._normalizeImpedance(z);
    const numerator = Math.sqrt((zn.real - 1) ** 2 + zn.imaginary ** 2);
    const denominator = Math.sqrt((zn.real + 1) ** 2 + zn.imaginary ** 2);
    return numerator / denominator;
  }

  private _computeStandingWaveRatio(reflectionCoeff: number): number {
    return (1 + reflectionCoeff) / (1 - reflectionCoeff);
  }

  private _calculateTransformationMatrix(): number[][] {
    const sourceZ = this._toComplexImpedance(this._sourceProfile);
    const targetZ = this._toComplexImpedance(this._targetProfile);
    
    return [
      [sourceZ.real, targetZ.imaginary],
      [targetZ.real, sourceZ.imaginary],
    ];
  }

  private _matrixDeterminant(matrix: number[][]): number {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  }

  match(): MatcherResult {
    const sourceZ = this._toComplexImpedance(this._sourceProfile);
    const targetZ = this._toComplexImpedance(this._targetProfile);
    
    const bandwidthRatio = this._sourceProfile.bandwidth / this._targetProfile.bandwidth;
    const latencyRatio = this._sourceProfile.latency / this._targetProfile.latency;
    const packetRatio = this._sourceProfile.packetSize / this._targetProfile.packetSize;
    
    const sourceReflect = this._computeReflectionCoefficient(sourceZ);
    const targetReflect = this._computeReflectionCoefficient(targetZ);
    
    const impedanceDistance = Math.sqrt(
      (sourceZ.real - targetZ.real) ** 2 + 
      (sourceZ.imaginary - targetZ.imaginary) ** 2
    );
    
    const transformationMatrix = this._calculateTransformationMatrix();
    const matrixDet = this._matrixDeterminant(transformationMatrix);
    
    const weightedRatio = (
      bandwidthRatio * 0.4 + 
      latencyRatio * 0.3 + 
      packetRatio * 0.2 + 
      (1 - Math.abs(matrixDet)) * 0.1
    );
    
    const transformationRatio = weightedRatio;
    const adjustedLatency = this._sourceProfile.latency * (1 + impedanceDistance * 0.1);
    const combinedReflect = (sourceReflect + targetReflect) / 2;
    const standingWaveRatio = this._computeStandingWaveRatio(combinedReflect);

    return {
      matched: Math.abs(transformationRatio - 1) < 0.15 && standingWaveRatio < 2,
      sourceProfile: { ...this._sourceProfile },
      targetProfile: { ...this._targetProfile },
      transformationRatio,
      adjustedLatency,
      reflectionCoefficient: combinedReflect,
      standingWaveRatio,
    };
  }

  transform(data: Record<string, unknown>): Record<string, unknown> {
    const result = this.match();
    
    if (result.matched) return { ...data };

    const serialized = JSON.stringify(data);
    const compressed = this._compress(serialized, result.transformationRatio);
    
    try {
      return JSON.parse(compressed) as Record<string, unknown>;
    } catch {
      return { ...data };
    }
  }

  private _compress(data: string, ratio: number): string {
    const entropy = this._computeEntropy(data);
    const effectiveRatio = ratio * (1 - entropy);
    
    if (effectiveRatio > 1) {
      const targetLength = Math.max(1, Math.floor(data.length / effectiveRatio));
      const step = Math.ceil(data.length / targetLength);
      return data.split('').filter((_, i) => i % step === 0).join('');
    }
    
    const repeatCount = Math.ceil(effectiveRatio);
    const padding = data.repeat(repeatCount).slice(0, Math.floor(data.length * effectiveRatio));
    return padding;
  }

  private _computeEntropy(data: string): number {
    const freq: Record<string, number> = {};
    for (const char of data) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const total = data.length;
    for (const count of Object.values(freq)) {
      const prob = count / total;
      entropy -= prob * Math.log2(prob);
    }
    
    return entropy / 8;
  }

  adaptProtocol(): void {
    const protocolPriority: Record<string, number> = { grpc: 3, websocket: 2, http: 1 };
    const sourcePriority = protocolPriority[this._sourceProfile.protocol];
    const targetPriority = protocolPriority[this._targetProfile.protocol];
    
    if (sourcePriority < targetPriority) {
      this._sourceProfile.protocol = this._targetProfile.protocol;
    } else if (targetPriority < sourcePriority) {
      this._targetProfile.protocol = this._sourceProfile.protocol;
    }
  }

  optimizeBandwidth(): number {
    const sourceZ = this._toComplexImpedance(this._sourceProfile);
    const targetZ = this._toComplexImpedance(this._targetProfile);
    
    const optimalReal = (sourceZ.real + targetZ.real) / 2;
    const optimalBandwidth = Math.min(
      this._sourceProfile.bandwidth, 
      this._targetProfile.bandwidth,
      optimalReal * 10
    );
    
    this._sourceProfile.bandwidth = optimalBandwidth;
    return optimalBandwidth;
  }

  getMismatchScore(): number {
    const result = this.match();
    const score = Math.abs(result.transformationRatio - 1) * 50 + 
                  result.reflectionCoefficient * 30 + 
                  (result.standingWaveRatio - 1) * 20;
    return Math.min(100, score);
  }
}